import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import type { Server } from 'http';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { GraphAnalysisService } from '../graph-analysis/graph-analysis.service';
import { PrismaService } from '../prisma/prisma.service';
import { FlowsController } from './flows.controller';
import { FlowsService } from './flows.service';
import type { FlowGraph } from './types/flow-graph.types';

function validGraph(): FlowGraph {
  return {
    nodes: [
      {
        id: 'start',
        type: 'start',
        label: 'Start',
        position: { x: 0, y: 0 },
      },
      {
        id: 'question',
        type: 'question',
        label: 'Question',
        questionType: 'singleChoice',
        position: { x: 100, y: 100 },
      },
      {
        id: 'end',
        type: 'end',
        label: 'End',
        position: { x: 200, y: 200 },
      },
    ],
    edges: [
      {
        id: 'edge-start-question',
        source: 'start',
        target: 'question',
      },
      {
        id: 'edge-question-end',
        source: 'question',
        target: 'end',
      },
    ],
  };
}

type GuardContextMock = {
  switchToHttp: () => {
    getRequest: () => {
      user?: {
        sub: string;
        email: string;
      };
    };
  };
};

type FlowResponseBody = {
  id: string;
  graph: FlowGraph;
};

type ErrorResponseBody = {
  message?: string;
  errors?: string[];
};

describe('Flows integration', () => {
  let app: INestApplication;
  let httpServer: Server;
  let prisma: PrismaService;
  let currentUserId = '';
  let currentUserEmail = '';

  const graphAnalysisServiceMock = {
    syncGraphProjection: jest.fn(),
    deleteGraphProjection: jest.fn(),
  };

  const authGuardMock = {
    canActivate: (context: GuardContextMock) => {
      const requestObject = context.switchToHttp().getRequest();

      requestObject.user = {
        sub: currentUserId,
        email: currentUserEmail,
      };

      return true;
    },
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FlowsController],
      providers: [
        FlowsService,
        PrismaService,
        {
          provide: GraphAnalysisService,
          useValue: graphAnalysisServiceMock,
        },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
            signAsync: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuardMock)
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue(authGuardMock)
      .compile();

    app = module.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    prisma = module.get<PrismaService>(PrismaService);

    await app.init();

    httpServer = app.getHttpServer() as Server;
  });

  beforeEach(async () => {
    graphAnalysisServiceMock.syncGraphProjection.mockReset();
    graphAnalysisServiceMock.deleteGraphProjection.mockReset();

    await prisma.flowAccess.deleteMany();
    await prisma.flowSession.deleteMany();
    await prisma.flow.deleteMany();
    await prisma.user.deleteMany();

    currentUserId = '';
    currentUserEmail = '';
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }

    if (prisma) {
      await prisma.$disconnect();
    }
  });

  async function createUser(email: string) {
    return prisma.user.create({
      data: {
        email,
        password: 'test-password-hash',
      },
    });
  }

  async function createOwnedFlow(ownerId: string) {
    return prisma.flow.create({
      data: {
        title: 'Integration test flow',
        description: 'Flow used by integration tests',
        visibility: 'private',
        status: 'draft',
        ownerId,
        graph: validGraph(),
      },
    });
  }

  it('API-005 allows owner to save a valid graph and syncs Neo4j projection', async () => {
    const owner = await createUser('owner@example.com');
    const flow = await createOwnedFlow(owner.id);

    currentUserId = owner.id;
    currentUserEmail = owner.email;

    const updatedGraph = validGraph();
    updatedGraph.nodes[1].label = 'Updated question';

    const response = await request(httpServer)
      .patch(`/flows/${flow.id}`)
      .send({
        graph: updatedGraph,
      })
      .expect(200);

    const responseBody = response.body as FlowResponseBody;

    expect(responseBody.id).toBe(flow.id);
    expect(responseBody.graph.nodes[1].label).toBe('Updated question');

    const storedFlow = await prisma.flow.findUnique({
      where: {
        id: flow.id,
      },
    });

    expect(storedFlow?.graph).toMatchObject(updatedGraph);
    expect(graphAnalysisServiceMock.syncGraphProjection).toHaveBeenCalledWith(
      flow.id,
      updatedGraph,
    );
  });

  it('API-001 rejects invalid graph update with 400 and does not overwrite stored graph', async () => {
    const owner = await createUser('owner@example.com');
    const flow = await createOwnedFlow(owner.id);

    currentUserId = owner.id;
    currentUserEmail = owner.email;

    const response = await request(httpServer)
      .patch(`/flows/${flow.id}`)
      .send({
        graph: {
          nodes: [],
          edges: [],
        },
      })
      .expect(400);

    const responseBody = response.body as ErrorResponseBody;

    expect(responseBody.message).toBe('Flow graph validation failed');
    expect(responseBody.errors).toContain(
      'Flow must contain at least one node.',
    );

    const storedFlow = await prisma.flow.findUnique({
      where: {
        id: flow.id,
      },
    });

    expect(storedFlow?.graph).toMatchObject(validGraph());
    expect(graphAnalysisServiceMock.syncGraphProjection).not.toHaveBeenCalled();
  });

  it('ACL-006 rejects graph update from shared viewer with 403', async () => {
    const owner = await createUser('owner@example.com');
    const viewer = await createUser('viewer@example.com');
    const flow = await createOwnedFlow(owner.id);

    await prisma.flowAccess.create({
      data: {
        flowId: flow.id,
        userId: viewer.id,
        role: 'viewer',
      },
    });

    currentUserId = viewer.id;
    currentUserEmail = viewer.email;

    await request(httpServer)
      .patch(`/flows/${flow.id}`)
      .send({
        graph: validGraph(),
      })
      .expect(403);

    expect(graphAnalysisServiceMock.syncGraphProjection).not.toHaveBeenCalled();
  });

  it('ACL-005 allows graph update from shared editor', async () => {
    const owner = await createUser('owner@example.com');
    const editor = await createUser('editor@example.com');
    const flow = await createOwnedFlow(owner.id);

    await prisma.flowAccess.create({
      data: {
        flowId: flow.id,
        userId: editor.id,
        role: 'editor',
      },
    });

    currentUserId = editor.id;
    currentUserEmail = editor.email;

    await request(httpServer)
      .patch(`/flows/${flow.id}`)
      .send({
        graph: validGraph(),
      })
      .expect(200);

    expect(graphAnalysisServiceMock.syncGraphProjection).toHaveBeenCalled();
  });
});
