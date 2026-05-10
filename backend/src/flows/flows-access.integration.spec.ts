import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
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

type TestRequest = {
  headers: {
    'x-test-user-id'?: string;
    'x-test-user-email'?: string;
  };
  user?: {
    sub: string;
    email: string;
  };
};

type GuardContextMock = {
  switchToHttp: () => {
    getRequest: () => TestRequest;
  };
};

type FlowResponseBody = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  status: string;
  ownerId: string | null;
};

type FlowAccessResponseBody = {
  id: string;
  role: 'viewer' | 'editor';
  user: {
    id: string;
    email: string;
  };
};

type ErrorResponseBody = {
  message?: string | string[];
  errors?: string[];
};

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

describe('Flows access integration', () => {
  let app: INestApplication;
  let httpServer: Server;
  let prisma: PrismaService;

  const graphAnalysisServiceMock = {
    syncGraphProjection: jest.fn(),
    deleteGraphProjection: jest.fn(),
  };

  const requiredAuthGuardMock = {
    canActivate: (context: GuardContextMock) => {
      const requestObject = context.switchToHttp().getRequest();
      const userId = requestObject.headers['x-test-user-id'];
      const email = requestObject.headers['x-test-user-email'];

      if (!userId || !email) {
        throw new UnauthorizedException(
          'Missing or invalid authorization header',
        );
      }

      requestObject.user = {
        sub: userId,
        email,
      };

      return true;
    },
  };

  const optionalAuthGuardMock = {
    canActivate: (context: GuardContextMock) => {
      const requestObject = context.switchToHttp().getRequest();
      const userId = requestObject.headers['x-test-user-id'];
      const email = requestObject.headers['x-test-user-email'];

      requestObject.user =
        userId && email
          ? {
              sub: userId,
              email,
            }
          : undefined;

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
      .useValue(requiredAuthGuardMock)
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue(optionalAuthGuardMock)
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
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }

    if (prisma) {
      await prisma.$disconnect();
    }
  });

  function authHeaders(user: { id: string; email: string }) {
    return {
      'x-test-user-id': user.id,
      'x-test-user-email': user.email,
    };
  }

  async function createUser(email: string) {
    return prisma.user.create({
      data: {
        email,
        password: 'test-password-hash',
      },
    });
  }

  async function createFlow(
    ownerId: string,
    visibility: 'private' | 'shared' | 'public',
  ) {
    return prisma.flow.create({
      data: {
        title: 'Access test flow',
        description: 'Flow used by access integration tests',
        visibility,
        status: 'draft',
        ownerId,
        graph: validGraph(),
      },
    });
  }

  it('ACL-001 allows owner to view their own private flow', async () => {
    const owner = await createUser('owner@example.com');
    const flow = await createFlow(owner.id, 'private');

    const response = await request(httpServer)
      .get(`/flows/${flow.id}`)
      .set(authHeaders(owner))
      .expect(200);

    const responseBody = response.body as FlowResponseBody;

    expect(responseBody.id).toBe(flow.id);
    expect(responseBody.ownerId).toBe(owner.id);
  });

  it('ACL-002 allows public flow to be viewed without login', async () => {
    const owner = await createUser('owner@example.com');
    const flow = await createFlow(owner.id, 'public');

    const response = await request(httpServer)
      .get(`/flows/${flow.id}`)
      .expect(200);

    const responseBody = response.body as FlowResponseBody;

    expect(responseBody.id).toBe(flow.id);
    expect(responseBody.visibility).toBe('public');
  });

  it('ACL-003 rejects anonymous access to private flow', async () => {
    const owner = await createUser('owner@example.com');
    const flow = await createFlow(owner.id, 'private');

    const response = await request(httpServer)
      .get(`/flows/${flow.id}`)
      .expect(403);

    const responseBody = response.body as ErrorResponseBody;

    expect(responseBody.message).toBe(
      'You do not have access to view this flow',
    );
  });

  it('ACL-004 allows owner to update flow metadata', async () => {
    const owner = await createUser('owner@example.com');
    const flow = await createFlow(owner.id, 'private');

    const response = await request(httpServer)
      .patch(`/flows/${flow.id}`)
      .set(authHeaders(owner))
      .send({
        title: 'Updated title',
        description: 'Updated description',
        visibility: 'public',
        status: 'published',
      })
      .expect(200);

    const responseBody = response.body as FlowResponseBody;

    expect(responseBody.id).toBe(flow.id);
    expect(responseBody.title).toBe('Updated title');
    expect(responseBody.visibility).toBe('public');
  });

  it('ACL-007 allows shared viewer to view a shared flow', async () => {
    const owner = await createUser('owner@example.com');
    const viewer = await createUser('viewer@example.com');
    const flow = await createFlow(owner.id, 'shared');

    await prisma.flowAccess.create({
      data: {
        flowId: flow.id,
        userId: viewer.id,
        role: 'viewer',
      },
    });

    const response = await request(httpServer)
      .get(`/flows/${flow.id}`)
      .set(authHeaders(viewer))
      .expect(200);

    const responseBody = response.body as FlowResponseBody;

    expect(responseBody.id).toBe(flow.id);
  });

  it('ACL-008 allows owner to share a flow with another registered user', async () => {
    const owner = await createUser('owner@example.com');
    const viewer = await createUser('viewer@example.com');
    const flow = await createFlow(owner.id, 'private');

    const response = await request(httpServer)
      .post(`/flows/${flow.id}/access`)
      .set(authHeaders(owner))
      .send({
        email: viewer.email,
        role: 'viewer',
      })
      .expect(201);

    const responseBody = response.body as FlowAccessResponseBody;

    expect(responseBody.role).toBe('viewer');
    expect(responseBody.user.email).toBe(viewer.email);

    const storedAccess = await prisma.flowAccess.findUnique({
      where: {
        flowId_userId: {
          flowId: flow.id,
          userId: viewer.id,
        },
      },
    });

    expect(storedAccess?.role).toBe('viewer');
  });

  it('ACL-009 allows owner to remove shared access', async () => {
    const owner = await createUser('owner@example.com');
    const viewer = await createUser('viewer@example.com');
    const flow = await createFlow(owner.id, 'shared');

    const access = await prisma.flowAccess.create({
      data: {
        flowId: flow.id,
        userId: viewer.id,
        role: 'viewer',
      },
    });

    await request(httpServer)
      .delete(`/flows/${flow.id}/access/${access.id}`)
      .set(authHeaders(owner))
      .expect(200);

    const deletedAccess = await prisma.flowAccess.findUnique({
      where: {
        id: access.id,
      },
    });

    expect(deletedAccess).toBeNull();
  });

  it('ACL-010 rejects sharing changes from a non-owner', async () => {
    const owner = await createUser('owner@example.com');
    const editor = await createUser('editor@example.com');
    const viewer = await createUser('viewer@example.com');
    const flow = await createFlow(owner.id, 'shared');

    await prisma.flowAccess.create({
      data: {
        flowId: flow.id,
        userId: editor.id,
        role: 'editor',
      },
    });

    const response = await request(httpServer)
      .post(`/flows/${flow.id}/access`)
      .set(authHeaders(editor))
      .send({
        email: viewer.email,
        role: 'viewer',
      })
      .expect(403);

    const responseBody = response.body as ErrorResponseBody;

    expect(responseBody.message).toBe(
      'You do not have access to modify this flow',
    );
  });

  it('ACL-011 rejects sharing a flow with its owner', async () => {
    const owner = await createUser('owner@example.com');
    const flow = await createFlow(owner.id, 'private');

    const response = await request(httpServer)
      .post(`/flows/${flow.id}/access`)
      .set(authHeaders(owner))
      .send({
        email: owner.email,
        role: 'viewer',
      })
      .expect(400);

    const responseBody = response.body as ErrorResponseBody;

    expect(responseBody.message).toBe('You already own this flow');
  });

  it('API-002 rejects protected route without authentication', async () => {
    const owner = await createUser('owner@example.com');
    const flow = await createFlow(owner.id, 'private');

    const response = await request(httpServer)
      .patch(`/flows/${flow.id}`)
      .send({
        title: 'Should fail',
      })
      .expect(401);

    const responseBody = response.body as ErrorResponseBody;

    expect(responseBody.message).toBe(
      'Missing or invalid authorization header',
    );
  });

  it('API-003 returns 404 for non-existing flow', async () => {
    const owner = await createUser('owner@example.com');

    const response = await request(httpServer)
      .get('/flows/00000000-0000-0000-0000-000000000000')
      .set(authHeaders(owner))
      .expect(404);

    const responseBody = response.body as ErrorResponseBody;

    expect(responseBody.message).toBe(
      'Flow with id 00000000-0000-0000-0000-000000000000 not found',
    );
  });

  it('API-004 returns a useful error response for invalid graph update', async () => {
    const owner = await createUser('owner@example.com');
    const flow = await createFlow(owner.id, 'private');

    const response = await request(httpServer)
      .patch(`/flows/${flow.id}`)
      .set(authHeaders(owner))
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
  });
});
