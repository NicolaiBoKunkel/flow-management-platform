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