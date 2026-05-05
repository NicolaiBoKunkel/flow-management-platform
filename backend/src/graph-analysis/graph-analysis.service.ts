import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { FlowAccessRole } from '@prisma/client';
import { FlowEdge, FlowGraph, FlowNode } from '../flows/types/flow-graph.types';
import { Neo4jService } from '../neo4j/neo4j.service';
import { PrismaService } from '../prisma/prisma.service';

type FlowAccessMode = 'view' | 'edit';

type Neo4jRecordLike = {
  get: (key: string) => unknown;
};

type Neo4jIntegerLike = {
  toNumber: () => number;
};

type Neo4jQueryResultLike = {
  records: unknown[];
};

type AnalysisNode = {
  nodeId: string;
  label: string;
  type: string;
};

type HighBranchingNode = AnalysisNode & {
  outgoingCount: number;
};

type GraphNodeProperties = {
  flowId: string;
  nodeId: string;
  type: FlowNode['type'];
  label: string;
  questionType: FlowNode['questionType'] | null;
  introText: string | null;
  questionText: string | null;
  resultText: string | null;
  infoText: string | null;
  positionX: number;
  positionY: number;
};

type GraphEdgeProperties = Record<string, string | number | boolean>;

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

  private isNeo4jRecordLike(value: unknown): value is Neo4jRecordLike {
    return (
      typeof value === 'object' &&
      value !== null &&
      'get' in value &&
      typeof (value as { get?: unknown }).get === 'function'
    );
  }

  private isNeo4jIntegerLike(value: unknown): value is Neo4jIntegerLike {
    return (
      typeof value === 'object' &&
      value !== null &&
      'toNumber' in value &&
      typeof (value as { toNumber?: unknown }).toNumber === 'function'
    );
  }

  private getFirstRecord(result: Neo4jQueryResultLike): Neo4jRecordLike {
    const record = result.records[0];

    if (!this.isNeo4jRecordLike(record)) {
      throw new InternalServerErrorException(
        'Neo4j query did not return a valid record.',
      );
    }

    return record;
  }

  private getNumberFromResult(
    result: Neo4jQueryResultLike,
    key: string,
  ): number {
    return this.getNumberFromRecord(this.getFirstRecord(result), key);
  }

  private getBooleanFromResult(
    result: Neo4jQueryResultLike,
    key: string,
  ): boolean {
    const value = this.getFirstRecord(result).get(key);

    if (typeof value === 'boolean') {
      return value;
    }

    throw new InternalServerErrorException(
      `Neo4j value "${key}" was expected to be a boolean.`,
    );
  }

  private getNumberFromRecord(record: Neo4jRecordLike, key: string): number {
    const value = record.get(key);

    if (this.isNeo4jIntegerLike(value)) {
      return value.toNumber();
    }

    if (typeof value === 'number') {
      return value;
    }

    throw new InternalServerErrorException(
      `Neo4j value "${key}" was expected to be numeric.`,
    );
  }

  private getStringFromUnknownRecord(record: unknown, key: string): string {
    if (!this.isNeo4jRecordLike(record)) {
      throw new InternalServerErrorException(
        'Neo4j query did not return a valid record.',
      );
    }

    const value = record.get(key);

    if (typeof value === 'string') {
      return value;
    }

    throw new InternalServerErrorException(
      `Neo4j value "${key}" was expected to be a string.`,
    );
  }

  private getNumberFromUnknownRecord(record: unknown, key: string): number {
    if (!this.isNeo4jRecordLike(record)) {
      throw new InternalServerErrorException(
        'Neo4j query did not return a valid record.',
      );
    }

    return this.getNumberFromRecord(record, key);
  }

  private buildNodeProperties(
    flowId: string,
    node: FlowNode,
  ): GraphNodeProperties {
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

  private buildEdgeProperties(edge: FlowEdge): GraphEdgeProperties {
    const properties: GraphEdgeProperties = {
      edgeId: edge.id,
    };

    if (edge.label) {
      properties.label = edge.label;
    }

    if (edge.condition) {
      properties.conditionKind = edge.condition.kind;

      if (edge.condition.kind === 'number') {
        properties.conditionOperator = edge.condition.operator;
        properties.conditionValue = edge.condition.value;
      }

      if (edge.condition.kind === 'numberRange') {
        properties.conditionMin = edge.condition.min;
        properties.conditionMax = edge.condition.max;
        properties.conditionMinInclusive = edge.condition.minInclusive;
        properties.conditionMaxInclusive = edge.condition.maxInclusive;
      }
    }

    return properties;
  }

  private mapAnalysisNode(record: unknown): AnalysisNode {
    return {
      nodeId: this.getStringFromUnknownRecord(record, 'nodeId'),
      label: this.getStringFromUnknownRecord(record, 'label'),
      type: this.getStringFromUnknownRecord(record, 'type'),
    };
  }

  private mapHighBranchingNode(record: unknown): HighBranchingNode {
    return {
      nodeId: this.getStringFromUnknownRecord(record, 'nodeId'),
      label: this.getStringFromUnknownRecord(record, 'label'),
      type: this.getStringFromUnknownRecord(record, 'type'),
      outgoingCount: this.getNumberFromUnknownRecord(record, 'outgoingCount'),
    };
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

      const nodeCount = this.getNumberFromResult(nodeCountResult, 'count');

      if (nodeCount === 0) {
        return {
          flowId,
          synced: false,
          message:
            'No Neo4j projection found for this flow. Save the flow graph or run sync projection first.',
        };
      }

      const edgeCountResult = await session.run(
        `
        MATCH (:FlowNode { flowId: $flowId })-[r:FLOW_EDGE]->(:FlowNode { flowId: $flowId })
        RETURN count(r) AS count
        `,
        { flowId },
      );

      const startNodeCountResult = await session.run(
        `
        MATCH (n:FlowNode { flowId: $flowId, type: 'start' })
        RETURN count(n) AS count
        `,
        { flowId },
      );

      const endNodeCountResult = await session.run(
        `
        MATCH (n:FlowNode { flowId: $flowId, type: 'end' })
        RETURN count(n) AS count
        `,
        { flowId },
      );

      const cycleResult = await session.run(
        `
        MATCH path = (n:FlowNode { flowId: $flowId })-[:FLOW_EDGE*1..50]->(n)
        RETURN count(path) > 0 AS hasCycles
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

      const pathsRecord = this.getFirstRecord(pathsResult);

      return {
        flowId,
        synced: true,
        nodeCount,
        edgeCount: this.getNumberFromResult(edgeCountResult, 'count'),
        startNodeCount: this.getNumberFromResult(startNodeCountResult, 'count'),
        endNodeCount: this.getNumberFromResult(endNodeCountResult, 'count'),
        hasCycles: this.getBooleanFromResult(cycleResult, 'hasCycles'),
        pathsToEndCount: this.getNumberFromRecord(pathsRecord, 'pathCount'),
        maxPathLength: this.getNumberFromRecord(pathsRecord, 'maxPathLength'),
        deadEndNodes: deadEndResult.records.map((record) =>
          this.mapAnalysisNode(record),
        ),
        unreachableNodes: unreachableResult.records.map((record) =>
          this.mapAnalysisNode(record),
        ),
        highBranchingNodes: highBranchingResult.records.map((record) =>
          this.mapHighBranchingNode(record),
        ),
      };
    } finally {
      await session.close();
    }
  }
}
