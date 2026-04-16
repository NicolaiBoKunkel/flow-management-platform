import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFlowDto } from './dto/create-flow.dto';

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

  findOne(id: string) {
    return this.prisma.flow.findUnique({
      where: { id },
    });
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
}