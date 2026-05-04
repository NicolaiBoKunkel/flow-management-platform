import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FlowAccessRole } from '@prisma/client';
import { FlowEdge, FlowGraph, FlowNode } from '../flows/types/flow-graph.types';
import { Neo4jService } from '../neo4j/neo4j.service';
import { PrismaService } from '../prisma/prisma.service';

type FlowAccessMode = 'view' | 'edit';

@Injectable()
export class GraphAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly neo4jService: Neo4jService,
  ) {}

  private async findAccessibleFlowOrThrow(
    flowId: string,
    userId: string | undefined,
    mode: FlowAccessMode,
  ) {
    const flow = await this.prisma.flow.findUnique({
      where: { id: flowId },
      include: {
        accessList: true,
      },
    });

    if (!flow) {
      throw new NotFoundException(`Flow with id ${flowId} not found`);
    }

    const isOwner = !!userId && flow.ownerId === userId;
    const isPublic = flow.visibility === 'public';

    const sharedAccess = userId
      ? flow.accessList.find((entry) => entry.userId === userId)
      : undefined;

    const canView = isOwner || isPublic || !!sharedAccess;
    const canEdit = isOwner || sharedAccess?.role === FlowAccessRole.editor;

    if (mode === 'view' && !canView) {
      throw new ForbiddenException('You do not have access to view this flow');
    }

    if (mode === 'edit' && !canEdit) {
      throw new ForbiddenException(
        'You do not have access to sync this flow analysis',
      );
    }

    return flow;
  }

  private buildNodeProperties(flowId: string, node: FlowNode) {
    return {
      flowId,
      nodeId: node.id,
      type: node.type,
      label: node.label,
      questionType: node.questionType ?? null,
      introText: node.introText ?? null,
      questionText: node.questionText ?? null,
      resultText: node.resultText ?? null,
      infoText: node.infoText ?? null,
      positionX: node.position.x,
      positionY: node.position.y,
    };
  }

  private buildEdgeProperties(edge: FlowEdge) {
    const base = {
      edgeId: edge.id,
      label: edge.label ?? null,
      conditionKind: edge.condition?.kind ?? null,
      conditionOperator:
        edge.condition?.kind === 'number' ? edge.condition.operator : null,
      conditionValue:
        edge.condition?.kind === 'number' ? edge.condition.value : null,
      conditionMin:
        edge.condition?.kind === 'numberRange' ? edge.condition.min : null,
      conditionMax:
        edge.condition?.kind === 'numberRange' ? edge.condition.max : null,
      conditionMinInclusive:
        edge.condition?.kind === 'numberRange'
          ? edge.condition.minInclusive
          : null,
      conditionMaxInclusive:
        edge.condition?.kind === 'numberRange'
          ? edge.condition.maxInclusive
          : null,
    };

    return Object.fromEntries(
      Object.entries(base).filter(([, value]) => value !== null),
    );
  }

  async syncGraphProjection(flowId: string, graph: FlowGraph) {
    const session = this.neo4jService.getSession();

    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `
          MATCH (n:FlowNode { flowId: $flowId })
          DETACH DELETE n
          `,
          { flowId },
        );

        for (const node of graph.nodes) {
          await tx.run(
            `
            CREATE (:FlowNode $properties)
            `,
            {
              properties: this.buildNodeProperties(flowId, node),
            },
          );
        }

        for (const edge of graph.edges) {
          await tx.run(
            `
            MATCH (source:FlowNode { flowId: $flowId, nodeId: $sourceId })
            MATCH (target:FlowNode { flowId: $flowId, nodeId: $targetId })
            CREATE (source)-[:FLOW_EDGE $properties]->(target)
            `,
            {
              flowId,
              sourceId: edge.source,
              targetId: edge.target,
              properties: this.buildEdgeProperties(edge),
            },
          );
        }
      });

      return {
        message: 'Flow graph synced to Neo4j',
        flowId,
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
      };
    } finally {
      await session.close();
    }
  }

  async deleteGraphProjection(flowId: string) {
    const session = this.neo4jService.getSession();

    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `
          MATCH (n:FlowNode { flowId: $flowId })
          DETACH DELETE n
          `,
          { flowId },
        );
      });

      return {
        message: 'Flow graph projection deleted from Neo4j',
        flowId,
      };
    } finally {
      await session.close();
    }
  }

  async syncFlowToNeo4j(flowId: string, userId: string) {
    const flow = await this.findAccessibleFlowOrThrow(flowId, userId, 'edit');

    if (!flow.graph || typeof flow.graph !== 'object') {
      throw new NotFoundException('Flow does not contain a valid graph');
    }

    const graph = flow.graph as unknown as FlowGraph;

    return this.syncGraphProjection(flowId, graph);
  }

  async analyzeFlow(flowId: string, userId?: string) {
    await this.findAccessibleFlowOrThrow(flowId, userId, 'view');

    const session = this.neo4jService.getSession();

    try {
      const nodeCountResult = await session.run(
        `
        MATCH (n:FlowNode { flowId: $flowId })
        RETURN count(n) AS count
        `,
        { flowId },
      );

      const nodeCount = nodeCountResult.records[0].get('count').toNumber();

      if (nodeCount === 0) {
        return {
          flowId,
          synced: false,
          message:
            'No Neo4j projection found for this flow. Run POST /flows/:flowId/analysis/sync first.',
        };
      }

      const edgeCountResult = await session.run(
        `
        MATCH (:FlowNode { flowId: $flowId })-[r:FLOW_EDGE]->(:FlowNode { flowId: $flowId })
        RETURN count(r) AS count
        `,
        { flowId },
      );

      const deadEndResult = await session.run(
        `
        MATCH (n:FlowNode { flowId: $flowId })
        WHERE n.type <> 'end'
        AND NOT (n)-[:FLOW_EDGE]->()
        RETURN n.nodeId AS nodeId, n.label AS label, n.type AS type
        ORDER BY n.label
        `,
        { flowId },
      );

      const highBranchingResult = await session.run(
        `
        MATCH (n:FlowNode { flowId: $flowId })-[r:FLOW_EDGE]->()
        WITH n, count(r) AS outgoingCount
        WHERE outgoingCount > 1
        RETURN n.nodeId AS nodeId, n.label AS label, n.type AS type, outgoingCount
        ORDER BY outgoingCount DESC
        `,
        { flowId },
      );

      const unreachableResult = await session.run(
        `
        MATCH (start:FlowNode { flowId: $flowId, type: 'start' })
        MATCH (n:FlowNode { flowId: $flowId })
        OPTIONAL MATCH path = (start)-[:FLOW_EDGE*0..50]->(n)
        WITH n, count(path) AS pathCount
        WHERE pathCount = 0
        RETURN n.nodeId AS nodeId, n.label AS label, n.type AS type
        ORDER BY n.label
        `,
        { flowId },
      );

      const pathsResult = await session.run(
        `
        MATCH (start:FlowNode { flowId: $flowId, type: 'start' })
        MATCH (end:FlowNode { flowId: $flowId, type: 'end' })
        OPTIONAL MATCH path = (start)-[:FLOW_EDGE*0..50]->(end)
        RETURN count(path) AS pathCount,
               coalesce(max(length(path)), 0) AS maxPathLength
        `,
        { flowId },
      );

      const edgeCount = edgeCountResult.records[0].get('count').toNumber();

      const pathsRecord = pathsResult.records[0];
      const pathsToEndCount = pathsRecord.get('pathCount').toNumber();
      const maxPathLength = pathsRecord.get('maxPathLength').toNumber();

      return {
        flowId,
        synced: true,
        nodeCount,
        edgeCount,
        pathsToEndCount,
        maxPathLength,
        deadEndNodes: deadEndResult.records.map((record) => ({
          nodeId: record.get('nodeId'),
          label: record.get('label'),
          type: record.get('type'),
        })),
        unreachableNodes: unreachableResult.records.map((record) => ({
          nodeId: record.get('nodeId'),
          label: record.get('label'),
          type: record.get('type'),
        })),
        highBranchingNodes: highBranchingResult.records.map((record) => ({
          nodeId: record.get('nodeId'),
          label: record.get('label'),
          type: record.get('type'),
          outgoingCount: record.get('outgoingCount').toNumber(),
        })),
      };
    } finally {
      await session.close();
    }
  }
}
