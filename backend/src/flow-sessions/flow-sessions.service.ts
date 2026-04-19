import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type FlowNode = {
  id: string;
  type: 'start' | 'question' | 'end' | 'info';
  label: string;
  position: {
    x: number;
    y: number;
  };
  introText?: string;
  questionText?: string;
  resultText?: string;
  infoText?: string;
};

type FlowEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

type FlowGraph = {
  nodes: FlowNode[];
  edges: FlowEdge[];
};

@Injectable()
export class FlowSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(flowId: string) {
    const flow = await this.prisma.flow.findUnique({
      where: { id: flowId },
    });

    if (!flow) {
      throw new NotFoundException(`Flow with id ${flowId} not found`);
    }

    if (!flow.graph || typeof flow.graph !== 'object') {
      throw new BadRequestException('Flow does not contain a valid graph.');
    }

    const graph = flow.graph as unknown as FlowGraph;

    if (!graph.nodes || !Array.isArray(graph.nodes) || graph.nodes.length === 0) {
      throw new BadRequestException('Flow graph does not contain any nodes.');
    }

    const startNodes = graph.nodes.filter((node) => node.type === 'start');

    if (startNodes.length !== 1) {
      throw new BadRequestException(
        'Flow must contain exactly one start node to start a session.',
      );
    }

    const startNode = startNodes[0];

    const session = await this.prisma.flowSession.create({
      data: {
        flowId: flow.id,
        currentNodeId: startNode.id,
        status: 'active',
        context: {},
      },
    });

    return {
      sessionId: session.id,
      flowId: flow.id,
      status: session.status,
      currentNode: startNode,
    };
  }

  async advance(flowId: string, sessionId: string, selectedEdgeId?: string) {
    const session = await this.prisma.flowSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session with id ${sessionId} not found`);
    }

    if (session.flowId !== flowId) {
      throw new BadRequestException(
        'Session does not belong to the specified flow.',
      );
    }

    if (session.status !== 'active') {
      throw new BadRequestException('Session is not active.');
    }

    const flow = await this.prisma.flow.findUnique({
      where: { id: flowId },
    });

    if (!flow) {
      throw new NotFoundException(`Flow with id ${flowId} not found`);
    }

    if (!flow.graph || typeof flow.graph !== 'object') {
      throw new BadRequestException('Flow does not contain a valid graph.');
    }

    const graph = flow.graph as unknown as FlowGraph;

    const currentNode = graph.nodes.find(
      (node) => node.id === session.currentNodeId,
    );

    if (!currentNode) {
      throw new BadRequestException('Current node not found in flow graph.');
    }

    if (currentNode.type === 'end') {
      throw new BadRequestException('Cannot advance from an end node.');
    }

    const outgoingEdges = graph.edges.filter(
      (edge) => edge.source === currentNode.id,
    );

    if (outgoingEdges.length === 0) {
      throw new BadRequestException('Current node has no outgoing edges.');
    }

    let chosenEdge: FlowEdge | undefined;

    if (outgoingEdges.length === 1) {
      chosenEdge = outgoingEdges[0];
    } else {
      if (!selectedEdgeId) {
        throw new BadRequestException(
          'Multiple outgoing edges found. selectedEdgeId is required.',
        );
      }

      chosenEdge = outgoingEdges.find((edge) => edge.id === selectedEdgeId);

      if (!chosenEdge) {
        throw new BadRequestException(
          'selectedEdgeId is not a valid outgoing edge from the current node.',
        );
      }
    }

    const nextNode = graph.nodes.find((node) => node.id === chosenEdge.target);

    if (!nextNode) {
      throw new BadRequestException('Target node not found in flow graph.');
    }

    const updatedSession = await this.prisma.flowSession.update({
      where: { id: session.id },
      data: {
        currentNodeId: nextNode.id,
        status: nextNode.type === 'end' ? 'completed' : 'active',
      },
    });

    return {
      sessionId: updatedSession.id,
      flowId,
      status: updatedSession.status,
      currentNode: nextNode,
    };
  }
}