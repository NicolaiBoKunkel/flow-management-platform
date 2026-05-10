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
import type { FlowGraph } from '../flows/types/flow-graph.types';
import { Neo4jService } from '../neo4j/neo4j.service';
import { PrismaService } from '../prisma/prisma.service';
import { GraphAnalysisController } from './graph-analysis.controller';
import { GraphAnalysisService } from './graph-analysis.service';

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

type ErrorResponseBody = {
  message?: string | string[];
};

type SyncResponseBody = {
  message: string;
  flowId: string;
  nodeCount: number;
  edgeCount: number;
};

type AnalysisResponseBody =
  | {
      flowId: string;
      synced: false;
      message: string;
    }
  | {
      flowId: string;
      synced: true;
      nodeCount: number;
      edgeCount: number;
      startNodeCount: number;
      endNodeCount: number;
      hasCycles: boolean;
      pathsToEndCount: number;
      maxPathLength: number;
      deadEndNodes: AnalysisNode[];
      unreachableNodes: AnalysisNode[];
      highBranchingNodes: HighBranchingNode[];
    };

type AnalysisNode = {
  nodeId: string;
  label: string;
  type: string;
};

type HighBranchingNode = AnalysisNode & {
  outgoingCount: number;
};

type Neo4jRecordMock = {
  get: (key: string) => unknown;
};

type Neo4jTxMock = {
  run: jest.Mock<Promise<unknown>, [string, Record<string, unknown>?]>;
};

function neoInt(value: number) {
  return {
    toNumber: () => value,
  };
}

function record(values: Record<string, unknown>): Neo4jRecordMock {
  return {
    get: (key: string) => values[key],
  };
}

function result(records: Neo4jRecordMock[]) {
  return {
    records,
  };
}

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

describe('Graph analysis integration', () => {
  let app: INestApplication;
  let httpServer: Server;
  let prisma: PrismaService;

  const txRunMock = jest.fn<
    Promise<unknown>,
    [string, Record<string, unknown>?]
  >();
  const sessionRunMock = jest.fn<
    Promise<unknown>,
    [string, Record<string, unknown>?]
  >();
  const sessionCloseMock = jest.fn<Promise<void>, []>();
  const executeWriteMock = jest.fn<
    Promise<unknown>,
    [(tx: Neo4jTxMock) => Promise<unknown>]
  >();

  const neo4jServiceMock = {
    getSession: jest.fn(() => ({
      run: sessionRunMock,
      executeWrite: executeWriteMock,
      close: sessionCloseMock,
    })),
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
      controllers: [GraphAnalysisController],
      providers: [
        GraphAnalysisService,
        PrismaService,
        {
          provide: Neo4jService,
          useValue: neo4jServiceMock,
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
    txRunMock.mockReset();
    sessionRunMock.mockReset();
    sessionCloseMock.mockReset();
    executeWriteMock.mockReset();
    neo4jServiceMock.getSession.mockClear();

    executeWriteMock.mockImplementation(async (callback) =>
      callback({
        run: txRunMock,
      }),
    );

    txRunMock.mockResolvedValue({});
    sessionCloseMock.mockResolvedValue();

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
    graph: FlowGraph = validGraph(),
  ) {
    return prisma.flow.create({
      data: {
        title: 'Graph analysis test flow',
        description: 'Flow used by graph-analysis integration tests',
        visibility,
        status: 'draft',
        ownerId,
        graph,
      },
    });
  }

  it('NEO-001 syncs a flow graph projection to Neo4j', async () => {
    const owner = await createUser('owner@example.com');
    const flow = await createFlow(owner.id, 'private');

    const response = await request(httpServer)
      .post(`/flows/${flow.id}/analysis/sync`)
      .set(authHeaders(owner))
      .expect(201);

    const responseBody = response.body as SyncResponseBody;

    expect(responseBody.message).toBe('Flow graph synced to Neo4j');
    expect(responseBody.flowId).toBe(flow.id);
    expect(responseBody.nodeCount).toBe(3);
    expect(responseBody.edgeCount).toBe(2);

    expect(executeWriteMock).toHaveBeenCalledTimes(1);
    expect(txRunMock).toHaveBeenCalledTimes(6);
    expect(sessionCloseMock).toHaveBeenCalledTimes(1);
  });

  it('NEO-002 returns graph analysis metrics', async () => {
    const owner = await createUser('owner@example.com');
    const flow = await createFlow(owner.id, 'public');

    sessionRunMock
      .mockResolvedValueOnce(result([record({ count: neoInt(5) })]))
      .mockResolvedValueOnce(result([record({ count: neoInt(4) })]))
      .mockResolvedValueOnce(result([record({ count: neoInt(1) })]))
      .mockResolvedValueOnce(result([record({ count: neoInt(3) })]))
      .mockResolvedValueOnce(result([record({ hasCycles: false })]))
      .mockResolvedValueOnce(result([]))
      .mockResolvedValueOnce(
        result([
          record({
            nodeId: 'question',
            label: 'Question',
            type: 'question',
            outgoingCount: neoInt(3),
          }),
        ]),
      )
      .mockResolvedValueOnce(result([]))
      .mockResolvedValueOnce(
        result([
          record({
            pathCount: neoInt(3),
            maxPathLength: neoInt(4),
          }),
        ]),
      );

    const response = await request(httpServer)
      .get(`/flows/${flow.id}/analysis`)
      .expect(200);

    const responseBody = response.body as AnalysisResponseBody;

    expect(responseBody.synced).toBe(true);

    if (responseBody.synced) {
      expect(responseBody.nodeCount).toBe(5);
      expect(responseBody.edgeCount).toBe(4);
      expect(responseBody.startNodeCount).toBe(1);
      expect(responseBody.endNodeCount).toBe(3);
      expect(responseBody.hasCycles).toBe(false);
      expect(responseBody.pathsToEndCount).toBe(3);
      expect(responseBody.maxPathLength).toBe(4);
      expect(responseBody.highBranchingNodes[0].nodeId).toBe('question');
      expect(responseBody.highBranchingNodes[0].outgoingCount).toBe(3);
    }

    expect(sessionRunMock).toHaveBeenCalledTimes(9);
    expect(sessionCloseMock).toHaveBeenCalledTimes(1);
  });

  it('NEO-003 returns synced false when no Neo4j projection exists', async () => {
    const owner = await createUser('owner@example.com');
    const flow = await createFlow(owner.id, 'public');

    sessionRunMock.mockResolvedValueOnce(
      result([
        record({
          count: neoInt(0),
        }),
      ]),
    );

    const response = await request(httpServer)
      .get(`/flows/${flow.id}/analysis`)
      .expect(200);

    const responseBody = response.body as AnalysisResponseBody;

    expect(responseBody.synced).toBe(false);

    if (!responseBody.synced) {
      expect(responseBody.message).toBe(
        'No Neo4j projection found for this flow. Save the flow graph or run sync projection first.',
      );
    }

    expect(sessionRunMock).toHaveBeenCalledTimes(1);
  });

  it('NEO-004/005/006/007 maps high branching, unreachable, dead-end nodes and cycles', async () => {
    const owner = await createUser('owner@example.com');
    const flow = await createFlow(owner.id, 'public');

    sessionRunMock
      .mockResolvedValueOnce(result([record({ count: neoInt(6) })]))
      .mockResolvedValueOnce(result([record({ count: neoInt(5) })]))
      .mockResolvedValueOnce(result([record({ count: neoInt(1) })]))
      .mockResolvedValueOnce(result([record({ count: neoInt(2) })]))
      .mockResolvedValueOnce(result([record({ hasCycles: true })]))
      .mockResolvedValueOnce(
        result([
          record({
            nodeId: 'dead-info',
            label: 'Dead info',
            type: 'info',
          }),
        ]),
      )
      .mockResolvedValueOnce(
        result([
          record({
            nodeId: 'branch-question',
            label: 'Branch question',
            type: 'question',
            outgoingCount: neoInt(3),
          }),
        ]),
      )
      .mockResolvedValueOnce(
        result([
          record({
            nodeId: 'unreachable-info',
            label: 'Unreachable info',
            type: 'info',
          }),
        ]),
      )
      .mockResolvedValueOnce(
        result([
          record({
            pathCount: neoInt(2),
            maxPathLength: neoInt(5),
          }),
        ]),
      );

    const response = await request(httpServer)
      .get(`/flows/${flow.id}/analysis`)
      .expect(200);

    const responseBody = response.body as AnalysisResponseBody;

    expect(responseBody.synced).toBe(true);

    if (responseBody.synced) {
      expect(responseBody.hasCycles).toBe(true);
      expect(responseBody.deadEndNodes).toEqual([
        {
          nodeId: 'dead-info',
          label: 'Dead info',
          type: 'info',
        },
      ]);
      expect(responseBody.unreachableNodes).toEqual([
        {
          nodeId: 'unreachable-info',
          label: 'Unreachable info',
          type: 'info',
        },
      ]);
      expect(responseBody.highBranchingNodes).toEqual([
        {
          nodeId: 'branch-question',
          label: 'Branch question',
          type: 'question',
          outgoingCount: 3,
        },
      ]);
    }
  });

  it('NEO-008 rejects sync for a viewer without edit access', async () => {
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
      .post(`/flows/${flow.id}/analysis/sync`)
      .set(authHeaders(viewer))
      .expect(403);

    const responseBody = response.body as ErrorResponseBody;

    expect(responseBody.message).toBe(
      'You do not have access to sync this flow analysis',
    );
    expect(executeWriteMock).not.toHaveBeenCalled();
  });

  it('NEO-009 allows shared editor to sync graph projection', async () => {
    const owner = await createUser('owner@example.com');
    const editor = await createUser('editor@example.com');
    const flow = await createFlow(owner.id, 'shared');

    await prisma.flowAccess.create({
      data: {
        flowId: flow.id,
        userId: editor.id,
        role: 'editor',
      },
    });

    const response = await request(httpServer)
      .post(`/flows/${flow.id}/analysis/sync`)
      .set(authHeaders(editor))
      .expect(201);

    const responseBody = response.body as SyncResponseBody;

    expect(responseBody.nodeCount).toBe(3);
    expect(responseBody.edgeCount).toBe(2);
    expect(executeWriteMock).toHaveBeenCalledTimes(1);
  });
});
