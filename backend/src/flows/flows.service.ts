import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FlowAccessRole } from '@prisma/client';
import { GraphAnalysisService } from '../graph-analysis/graph-analysis.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFlowDto } from './dto/create-flow.dto';
import { ShareFlowDto } from './dto/share-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';
import { validateFlowGraph } from './flow-graph-validator';
import { FlowGraph } from './types/flow-graph.types';

@Injectable()
export class FlowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly graphAnalysisService: GraphAnalysisService,
  ) {}

  findAll(userId?: string) {
    return this.prisma.flow.findMany({
      where: userId
        ? {
            OR: [
              { ownerId: userId },
              { visibility: 'public' },
              {
                visibility: 'shared',
                accessList: {
                  some: {
                    userId,
                  },
                },
              },
            ],
          }
        : {
            visibility: 'public',
          },
      include: {
        accessList: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findMine(userId: string) {
    return this.prisma.flow.findMany({
      where: {
        ownerId: userId,
      },
      include: {
        accessList: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId?: string) {
    const flow = await this.prisma.flow.findUnique({
      where: { id },
      include: {
        accessList: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!flow) {
      throw new NotFoundException(`Flow with id ${id} not found`);
    }

    const isOwner = !!userId && flow.ownerId === userId;
    const isPublic = flow.visibility === 'public';
    const hasSharedAccess =
      !!userId && flow.accessList.some((entry) => entry.userId === userId);

    if (!isPublic && !isOwner && !hasSharedAccess) {
      throw new ForbiddenException('You do not have access to view this flow');
    }

    return flow;
  }

  create(createFlowDto: CreateFlowDto, ownerId: string) {
    return this.prisma.flow.create({
      data: {
        title: createFlowDto.title,
        description: createFlowDto.description,
        visibility: createFlowDto.visibility,
        status: createFlowDto.status,
        ownerId,
      },
    });
  }

  async getFlowAccessList(flowId: string, userId: string) {
    const flow = await this.findOwnedFlowOrThrow(flowId, userId);

    return this.prisma.flowAccess.findMany({
      where: {
        flowId: flow.id,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async shareFlow(flowId: string, shareFlowDto: ShareFlowDto, userId: string) {
    const flow = await this.findOwnedFlowOrThrow(flowId, userId);

    const targetUser = await this.prisma.user.findUnique({
      where: {
        email: shareFlowDto.email.toLowerCase(),
      },
    });

    if (!targetUser) {
      throw new NotFoundException('No registered user found with that email');
    }

    if (flow.ownerId === targetUser.id) {
      throw new BadRequestException('You already own this flow');
    }

    return this.prisma.flowAccess.upsert({
      where: {
        flowId_userId: {
          flowId,
          userId: targetUser.id,
        },
      },
      update: {
        role: shareFlowDto.role as FlowAccessRole,
      },
      create: {
        flowId,
        userId: targetUser.id,
        role: shareFlowDto.role as FlowAccessRole,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }

  async removeFlowAccess(flowId: string, accessId: string, userId: string) {
    await this.findOwnedFlowOrThrow(flowId, userId);

    const access = await this.prisma.flowAccess.findUnique({
      where: { id: accessId },
    });

    if (!access || access.flowId !== flowId) {
      throw new NotFoundException('Shared access entry not found');
    }

    return this.prisma.flowAccess.delete({
      where: { id: accessId },
    });
  }

  private async findOwnedFlowOrThrow(id: string, userId: string) {
    const flow = await this.prisma.flow.findUnique({
      where: { id },
      include: {
        accessList: true,
      },
    });

    if (!flow) {
      throw new NotFoundException(`Flow with id ${id} not found`);
    }

    if (!flow.ownerId || flow.ownerId !== userId) {
      throw new ForbiddenException(
        'You do not have access to modify this flow',
      );
    }

    return flow;
  }

  private async findEditableFlowOrThrow(id: string, userId: string) {
    const flow = await this.prisma.flow.findUnique({
      where: { id },
      include: {
        accessList: true,
      },
    });

    if (!flow) {
      throw new NotFoundException(`Flow with id ${id} not found`);
    }

    const isOwner = flow.ownerId === userId;
    const editorAccess = flow.accessList.find(
      (entry) => entry.userId === userId && entry.role === 'editor',
    );

    if (!isOwner && !editorAccess) {
      throw new ForbiddenException(
        'You do not have access to modify this flow',
      );
    }

    return flow;
  }

  async update(id: string, updateFlowDto: UpdateFlowDto, userId: string) {
    const isGraphOnlyUpdate =
      updateFlowDto.graph !== undefined &&
      updateFlowDto.title === undefined &&
      updateFlowDto.description === undefined &&
      updateFlowDto.visibility === undefined &&
      updateFlowDto.status === undefined;

    if (isGraphOnlyUpdate) {
      await this.findEditableFlowOrThrow(id, userId);
    } else {
      await this.findOwnedFlowOrThrow(id, userId);
    }

    const graph = updateFlowDto.graph as FlowGraph | undefined;

    if (graph) {
      const validationErrors = validateFlowGraph(graph);

      if (validationErrors.length > 0) {
        throw new BadRequestException({
          message: 'Flow graph validation failed',
          errors: validationErrors,
        });
      }
    }

    const updatedFlow = await this.prisma.flow.update({
      where: { id },
      data: updateFlowDto,
    });

    if (graph) {
      try {
        await this.graphAnalysisService.syncGraphProjection(id, graph);
      } catch (error) {
        console.warn(
          `Flow ${id} was saved to PostgreSQL, but Neo4j projection sync failed.`,
          error,
        );
      }
    }

    return updatedFlow;
  }

  async remove(id: string, userId: string) {
    await this.findOwnedFlowOrThrow(id, userId);

    const deletedFlow = await this.prisma.flow.delete({
      where: { id },
    });

    try {
      await this.graphAnalysisService.deleteGraphProjection(id);
    } catch (error) {
      console.warn(
        `Flow ${id} was deleted from PostgreSQL, but Neo4j projection cleanup failed.`,
        error,
      );
    }

    return deletedFlow;
  }
}
