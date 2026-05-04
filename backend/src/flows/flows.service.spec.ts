import { Test, TestingModule } from '@nestjs/testing';
import { FlowsService } from './flows.service';
import { PrismaService } from '../prisma/prisma.service';

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
            },
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
