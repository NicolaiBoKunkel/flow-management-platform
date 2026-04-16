import { Test, TestingModule } from '@nestjs/testing';
import { FlowsController } from './flows.controller';
import { FlowsService } from './flows.service';

describe('FlowsController', () => {
  let controller: FlowsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FlowsController],
      providers: [
        {
          provide: FlowsService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<FlowsController>(FlowsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});