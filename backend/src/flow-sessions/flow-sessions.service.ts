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

type FlowSessionHistoryEntry = {
  nodeId: string;
  nodeType: FlowNode['type'];
  enteredAt: string;
  viaEdgeId?: string;
  viaEdgeLabel?: string;
};

type FlowSessionAnswerEntry = {
  nodeId: string;
  selectedEdgeId: string;
  selectedLabel?: string;
  answeredAt: string;
};

type FlowSessionContext = {
  history: FlowSessionHistoryEntry[];
  answers: FlowSessionAnswerEntry[];
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

    const initialContext: FlowSessionContext = {
      history: [
        {
          nodeId: startNode.id,
          nodeType: startNode.type,
          enteredAt: new Date().toISOString(),
        },
      ],
      answers: [],
    };

    const session = await this.prisma.flowSession.create({
      data: {
        flowId: flow.id,
        currentNodeId: startNode.id,
        status: 'active',
        context: initialContext,
      },
    });

    return {
      sessionId: session.id,
      flowId: flow.id,
      status: session.status,
      currentNode: startNode,
      canGoBack: false,
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

    const existingContext =
      session.context && typeof session.context === 'object'
        ? (session.context as unknown as FlowSessionContext)
        : null;

    const currentContext: FlowSessionContext = {
      history: Array.isArray(existingContext?.history)
        ? existingContext.history
        : [],
      answers: Array.isArray(existingContext?.answers)
        ? existingContext.answers
        : [],
    };

    const updatedAnswers =
      currentNode.type === 'question'
        ? [
            ...currentContext.answers.filter(
              (answer) => answer.nodeId !== currentNode.id,
            ),
            {
              nodeId: currentNode.id,
              selectedEdgeId: chosenEdge.id,
              selectedLabel: chosenEdge.label,
              answeredAt: new Date().toISOString(),
            },
          ]
        : currentContext.answers;

    const updatedHistory: FlowSessionHistoryEntry[] = [
      ...currentContext.history,
      {
        nodeId: nextNode.id,
        nodeType: nextNode.type,
        enteredAt: new Date().toISOString(),
        viaEdgeId: chosenEdge.id,
        viaEdgeLabel: chosenEdge.label,
      },
    ];

    const updatedContext: FlowSessionContext = {
      history: updatedHistory,
      answers: updatedAnswers,
    };

    const updatedSession = await this.prisma.flowSession.update({
      where: { id: session.id },
      data: {
        currentNodeId: nextNode.id,
        status: nextNode.type === 'end' ? 'completed' : 'active',
        context: updatedContext,
      },
    });

    return {
      sessionId: updatedSession.id,
      flowId,
      status: updatedSession.status,
      currentNode: nextNode,
      canGoBack: updatedHistory.length > 1,
    };
  }

  async goBack(flowId: string, sessionId: string) {
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

    if (session.status === 'abandoned') {
      throw new BadRequestException('Cannot go back on an abandoned session.');
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

    const existingContext =
      session.context && typeof session.context === 'object'
        ? (session.context as unknown as FlowSessionContext)
        : null;

    const currentContext: FlowSessionContext = {
      history: Array.isArray(existingContext?.history)
        ? existingContext.history
        : [],
      answers: Array.isArray(existingContext?.answers)
        ? existingContext.answers
        : [],
    };

    if (currentContext.history.length < 2) {
      throw new BadRequestException('There is no previous step to go back to.');
    }

    const newHistory = currentContext.history.slice(0, -1);
    const previousEntry = newHistory[newHistory.length - 1];

    if (!previousEntry) {
      throw new BadRequestException('Previous history entry could not be found.');
    }

    const previousNode = graph.nodes.find((node) => node.id === previousEntry.nodeId);

    if (!previousNode) {
      throw new BadRequestException('Previous node not found in flow graph.');
    }

    const remainingNodeIds = new Set(newHistory.map((entry) => entry.nodeId));

    let updatedAnswers = currentContext.answers.filter((answer) =>
      remainingNodeIds.has(answer.nodeId),
    );

    if (previousNode.type === 'question') {
      updatedAnswers = updatedAnswers.filter(
        (answer) => answer.nodeId !== previousNode.id,
      );
    }

    const updatedContext: FlowSessionContext = {
      history: newHistory,
      answers: updatedAnswers,
    };

    const updatedSession = await this.prisma.flowSession.update({
      where: { id: session.id },
      data: {
        currentNodeId: previousNode.id,
        status: previousNode.type === 'end' ? 'completed' : 'active',
        context: updatedContext,
      },
    });

    return {
      sessionId: updatedSession.id,
      flowId,
      status: updatedSession.status,
      currentNode: previousNode,
      canGoBack: newHistory.length > 1,
    };
  }
}