import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFlowDto } from './dto/create-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';

type NumberOperator = 'lt' | 'lte' | 'gt' | 'gte' | 'eq';

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
  condition?: {
    kind: 'number';
    operator: NumberOperator;
    value: number;
  };
};

type FlowGraph = {
  nodes: FlowNode[];
  edges: FlowEdge[];
};

type NumberInterval = {
  min: number;
  minInclusive: boolean;
  max: number;
  maxInclusive: boolean;
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

  private toNumberInterval(edge: FlowEdge): NumberInterval | null {
    const condition = edge.condition;

    if (!condition || condition.kind !== 'number') {
      return null;
    }

    switch (condition.operator) {
      case 'lt':
        return {
          min: Number.NEGATIVE_INFINITY,
          minInclusive: false,
          max: condition.value,
          maxInclusive: false,
        };
      case 'lte':
        return {
          min: Number.NEGATIVE_INFINITY,
          minInclusive: false,
          max: condition.value,
          maxInclusive: true,
        };
      case 'gt':
        return {
          min: condition.value,
          minInclusive: false,
          max: Number.POSITIVE_INFINITY,
          maxInclusive: false,
        };
      case 'gte':
        return {
          min: condition.value,
          minInclusive: true,
          max: Number.POSITIVE_INFINITY,
          maxInclusive: false,
        };
      case 'eq':
        return {
          min: condition.value,
          minInclusive: true,
          max: condition.value,
          maxInclusive: true,
        };
      default:
        return null;
    }
  }

  private intervalsOverlap(a: NumberInterval, b: NumberInterval): boolean {
    if (a.max < b.min) {
      return false;
    }

    if (b.max < a.min) {
      return false;
    }

    if (a.max === b.min) {
      return a.maxInclusive && b.minInclusive;
    }

    if (b.max === a.min) {
      return b.maxInclusive && a.minInclusive;
    }

    return true;
  }

  private validateGraph(graph: FlowGraph): string[] {
    const errors: string[] = [];

    if (!graph.nodes || graph.nodes.length === 0) {
      errors.push('Flow must contain at least one node.');
      return errors;
    }

    const startNodes = graph.nodes.filter((node) => node.type === 'start');
    const questionNodes = graph.nodes.filter(
      (node) => node.type === 'question',
    );
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
          errors.push(
            `Question node "${node.label}" must have a questionType.`,
          );
        } else if (
          node.questionType !== 'singleChoice' &&
          node.questionType !== 'number' &&
          node.questionType !== 'text'
        ) {
          errors.push(
            `Question node "${node.label}" uses unsupported questionType "${String(node.questionType)}".`,
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

      if (edge.condition) {
        if (edge.condition.kind !== 'number') {
          errors.push(`Edge "${edge.id}" has an unsupported condition kind.`);
        }

        if (
          !['lt', 'lte', 'gt', 'gte', 'eq'].includes(edge.condition.operator)
        ) {
          errors.push(`Edge "${edge.id}" has an invalid number operator.`);
        }

        if (
          typeof edge.condition.value !== 'number' ||
          Number.isNaN(edge.condition.value)
        ) {
          errors.push(
            `Edge "${edge.id}" must have a valid numeric condition value.`,
          );
        }
      }
    }

    for (const startNode of startNodes) {
      const hasIncomingEdge = graph.edges.some(
        (edge) => edge.target === startNode.id,
      );

      if (hasIncomingEdge) {
        errors.push(
          `Start node "${startNode.label}" cannot have incoming edges.`,
        );
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
      const outgoingEdges = graph.edges.filter(
        (edge) => edge.source === node.id,
      );

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

      if (node.type === 'question' && node.questionType === 'number') {
        for (const edge of outgoingEdges) {
          if (!edge.condition) {
            errors.push(
              `All outgoing edges from number question "${node.label}" must have a numeric condition.`,
            );
          }
        }

        for (let i = 0; i < outgoingEdges.length; i++) {
          for (let j = i + 1; j < outgoingEdges.length; j++) {
            const firstEdge = outgoingEdges[i];
            const secondEdge = outgoingEdges[j];

            const firstInterval = this.toNumberInterval(firstEdge);
            const secondInterval = this.toNumberInterval(secondEdge);

            if (!firstInterval || !secondInterval) {
              continue;
            }

            if (this.intervalsOverlap(firstInterval, secondInterval)) {
              errors.push(
                `Number question "${node.label}" has overlapping conditions on edges "${firstEdge.id}" and "${secondEdge.id}".`,
              );
            }
          }
        }
      }

      if (node.type === 'question' && node.questionType === 'text') {
        if (outgoingEdges.length !== 1) {
          errors.push(
            `Text question "${node.label}" must have exactly one outgoing edge.`,
          );
        }

        for (const edge of outgoingEdges) {
          if (edge.condition) {
            errors.push(
              `Text question "${node.label}" cannot use edge conditions.`,
            );
          }
        }
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
          errors.push(
            `Node "${node.label}" is not reachable from the start node.`,
          );
        }
      }

      const reachableEndNodes = endNodes.filter((node) => visited.has(node.id));

      if (reachableEndNodes.length === 0) {
        errors.push(
          'At least one end node must be reachable from the start node.',
        );
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
