import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFlowDto } from './dto/create-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';

type FlowNode = {
  id: string;
  type: 'start' | 'question' | 'end' | 'info';
  label: string;
  position: {
    x: number;
    y: number;
  };
  questionType?: 'singleChoice' | 'number' | 'text';
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
export class FlowsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.flow.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const flow = await this.prisma.flow.findUnique({
      where: { id },
    });

    if (!flow) {
      throw new NotFoundException(`Flow with id ${id} not found`);
    }

    return flow;
  }

  create(createFlowDto: CreateFlowDto) {
    return this.prisma.flow.create({
      data: {
        title: createFlowDto.title,
        description: createFlowDto.description,
        visibility: createFlowDto.visibility,
        status: createFlowDto.status,
      },
    });
  }

  private validateGraph(graph: FlowGraph): string[] {
    const errors: string[] = [];

    if (!graph.nodes || graph.nodes.length === 0) {
      errors.push('Flow must contain at least one node.');
      return errors;
    }

    const startNodes = graph.nodes.filter((node) => node.type === 'start');
    const questionNodes = graph.nodes.filter((node) => node.type === 'question');
    const endNodes = graph.nodes.filter((node) => node.type === 'end');

    if (startNodes.length !== 1) {
      errors.push('Flow must contain exactly one start node.');
    }

    if (questionNodes.length < 1) {
      errors.push('Flow must contain at least one question node.');
    }

    if (endNodes.length < 1) {
      errors.push('Flow must contain at least one end node.');
    }

    const nodeIds = new Set(graph.nodes.map((node) => node.id));

    for (const node of graph.nodes) {
      if (node.type === 'question') {
        if (!node.questionType) {
          errors.push(`Question node "${node.label}" must have a questionType.`);
        } else if (node.questionType !== 'singleChoice') {
          errors.push(
            `Question node "${node.label}" uses unsupported questionType "${node.questionType}".`,
          );
        }
      }
    }

    for (const edge of graph.edges) {
      if (!nodeIds.has(edge.source)) {
        errors.push(
          `Edge "${edge.id}" has source "${edge.source}" which does not exist.`,
        );
      }

      if (!nodeIds.has(edge.target)) {
        errors.push(
          `Edge "${edge.id}" has target "${edge.target}" which does not exist.`,
        );
      }
    }

    for (const startNode of startNodes) {
      const hasIncomingEdge = graph.edges.some(
        (edge) => edge.target === startNode.id,
      );

      if (hasIncomingEdge) {
        errors.push(`Start node "${startNode.label}" cannot have incoming edges.`);
      }
    }

    for (const endNode of endNodes) {
      const hasOutgoingEdge = graph.edges.some(
        (edge) => edge.source === endNode.id,
      );

      if (hasOutgoingEdge) {
        errors.push(`End node "${endNode.label}" cannot have outgoing edges.`);
      }
    }

    for (const node of graph.nodes) {
      const outgoingEdges = graph.edges.filter((edge) => edge.source === node.id);

      if (
        (node.type === 'start' ||
          node.type === 'question' ||
          node.type === 'info') &&
        outgoingEdges.length === 0
      ) {
        errors.push(
          `${node.type.charAt(0).toUpperCase() + node.type.slice(1)} node "${node.label}" must have at least one outgoing edge.`,
        );
      }
    }

    if (startNodes.length === 1) {
      const startNode = startNodes[0];
      const visited = new Set<string>();
      const queue: string[] = [startNode.id];

      while (queue.length > 0) {
        const currentNodeId = queue.shift();

        if (!currentNodeId || visited.has(currentNodeId)) {
          continue;
        }

        visited.add(currentNodeId);

        const nextEdges = graph.edges.filter(
          (edge) => edge.source === currentNodeId,
        );

        for (const edge of nextEdges) {
          if (!visited.has(edge.target)) {
            queue.push(edge.target);
          }
        }
      }

      for (const node of graph.nodes) {
        if (!visited.has(node.id)) {
          errors.push(`Node "${node.label}" is not reachable from the start node.`);
        }
      }

      const reachableEndNodes = endNodes.filter((node) => visited.has(node.id));

      if (reachableEndNodes.length === 0) {
        errors.push('At least one end node must be reachable from the start node.');
      }
    }

    return errors;
  }

  async update(id: string, updateFlowDto: UpdateFlowDto) {
    await this.findOne(id);

    if (updateFlowDto.graph) {
      const validationErrors = this.validateGraph(
        updateFlowDto.graph as FlowGraph,
      );

      if (validationErrors.length > 0) {
        throw new BadRequestException({
          message: 'Flow graph validation failed',
          errors: validationErrors,
        });
      }
    }

    return this.prisma.flow.update({
      where: { id },
      data: updateFlowDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.flow.delete({
      where: { id },
    });
  }
}