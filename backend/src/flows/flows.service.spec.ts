import { Test, TestingModule } from '@nestjs/testing';
import { GraphAnalysisService } from '../graph-analysis/graph-analysis.service';
import { PrismaService } from '../prisma/prisma.service';
import { FlowsService } from './flows.service';

describe('FlowsService', () => {
  let service: FlowsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlowsService,
        {
          provide: PrismaService,
          useValue: {
            flow: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            flowAccess: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              upsert: jest.fn(),
              delete: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: GraphAnalysisService,
          useValue: {
            syncGraphProjection: jest.fn(),
            deleteGraphProjection: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FlowsService>(FlowsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
