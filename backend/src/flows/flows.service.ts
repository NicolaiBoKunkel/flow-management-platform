import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFlowDto } from './dto/create-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';

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

  async update(id: string, updateFlowDto: UpdateFlowDto) {
    await this.findOne(id);

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