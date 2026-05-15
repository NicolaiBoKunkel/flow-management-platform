import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Server } from 'http';
import request from 'supertest';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import type {
  DomainNodeType,
  FlowEdge,
  FlowGraph,
  FlowNode,
  QuestionType,
} from '../flows/types/flow-graph.types';
import { PrismaService } from '../prisma/prisma.service';
import { FlowSessionsController } from './flow-sessions.controller';
import { FlowSessionsService } from './flow-sessions.service';

type SessionStatus = 'active' | 'completed' | 'abandoned';

type AnswerSummaryEntry = {
  nodeId: string;
  question: string;
  answer: string | number | string[];
  answeredAt: string;
};

type SessionResponseBody = {
  sessionId: string;
  flowId: string;
  status: SessionStatus;
  currentNode: FlowNode;
  canGoBack: boolean;
  answerSummary: AnswerSummaryEntry[];
};

type ErrorResponseBody = {
  message?: string;
};

type StoredSessionContext = {
  answers?: Array<{
    nodeId: string;
    selectedEdgeId: string;
    selectedLabel?: string;
    numericValue?: number;
    textValue?: string;
    selectedOptions?: string[];
    answeredAt: string;
  }>;
};

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

function node(
  id: string,
  type: DomainNodeType,
  label: string,
  questionType?: QuestionType,
  options?: string[],
): FlowNode {
  return {
    id,
    type,
    label,
    questionType,
    options,
    position: {
      x: 0,
      y: 0,
    },
  };
}

function edge(
  id: string,
  source: string,
  target: string,
  condition?: FlowEdge['condition'],
  label?: string,
): FlowEdge {
  return {
    id,
    source,
    target,
    condition,
    label,
  };
}

function numericBranchingGraph(): FlowGraph {
  return {
    nodes: [
      node('start', 'start', 'Start'),
      node('age-question', 'question', 'How old are you?', 'number'),
      node('young-end', 'end', 'Young result'),
      node('adult-end', 'end', 'Adult result'),
      node('senior-end', 'end', 'Senior result'),
    ],
    edges: [
      edge('edge-start-age', 'start', 'age-question'),
      edge(
        'edge-under-18',
        'age-question',
        'young-end',
        {
          kind: 'number',
          operator: 'lt',
          value: 18,
        },
        '< 18',
      ),
      edge(
        'edge-18-60',
        'age-question',
        'adult-end',
        {
          kind: 'numberRange',
          min: 18,
          max: 60,
          minInclusive: true,
          maxInclusive: true,
        },
        '[18 - 60]',
      ),
      edge(
        'edge-over-60',
        'age-question',
        'senior-end',
        {
          kind: 'number',
          operator: 'gt',
          value: 60,
        },
        '> 60',
      ),
    ],
  };
}

function zeroBoundaryGraph(): FlowGraph {
  return {
    nodes: [
      node('start', 'start', 'Start'),
      node('number-question', 'question', 'Enter a number', 'number'),
      node('negative-end', 'end', 'Negative result'),
      node('zero-to-hundred-end', 'end', 'Zero to hundred result'),
      node('over-hundred-end', 'end', 'Over hundred result'),
    ],
    edges: [
      edge('edge-start-number', 'start', 'number-question'),
      edge(
        'edge-negative',
        'number-question',
        'negative-end',
        {
          kind: 'number',
          operator: 'lt',
          value: 0,
        },
        '< 0',
      ),
      edge(
        'edge-zero-to-hundred',
        'number-question',
        'zero-to-hundred-end',
        {
          kind: 'numberRange',
          min: 0,
          max: 100,
          minInclusive: true,
          maxInclusive: true,
        },
        '[0 - 100]',
      ),
      edge(
        'edge-over-hundred',
        'number-question',
        'over-hundred-end',
        {
          kind: 'number',
          operator: 'gt',
          value: 100,
        },
        '> 100',
      ),
    ],
  };
}

function singleChoiceGraph(): FlowGraph {
  return {
    nodes: [
      node('start', 'start', 'Start'),
      node('choice-question', 'question', 'Choose one', 'singleChoice'),
      node('yes-end', 'end', 'Yes result'),
      node('no-end', 'end', 'No result'),
    ],
    edges: [
      edge('edge-start-choice', 'start', 'choice-question'),
      edge('edge-yes', 'choice-question', 'yes-end', undefined, 'Yes'),
      edge('edge-no', 'choice-question', 'no-end', undefined, 'No'),
    ],
  };
}

function textGraph(): FlowGraph {
  return {
    nodes: [
      node('start', 'start', 'Start'),
      node('text-question', 'question', 'Write something', 'text'),
      node('end', 'end', 'End'),
    ],
    edges: [
      edge('edge-start-text', 'start', 'text-question'),
      edge('edge-text-end', 'text-question', 'end'),
    ],
  };
}

function multipleChoiceGraph(): FlowGraph {
  return {
    nodes: [
      node('start', 'start', 'Start'),
      node(
        'multiple-choice-question',
        'question',
        'Choose multiple options',
        'multipleChoice',
        ['Option A', 'Option B', 'Option C'],
      ),
      node('end', 'end', 'End'),
    ],
    edges: [
      edge('edge-start-multiple-choice', 'start', 'multiple-choice-question'),
      edge('edge-multiple-choice-end', 'multiple-choice-question', 'end'),
    ],
  };
}

describe('Flow sessions integration', () => {
  let app: INestApplication;
  let httpServer: Server;
  let prisma: PrismaService;

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
      controllers: [FlowSessionsController],
      providers: [FlowSessionsService, PrismaService],
    })
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
    await prisma.flowSession.deleteMany();
    await prisma.flowAccess.deleteMany();
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
    graph: FlowGraph,
    options?: {
      visibility?: 'private' | 'shared' | 'public';
      ownerId?: string;
    },
  ) {
    return prisma.flow.create({
      data: {
        title: 'Runtime integration flow',
        description: 'Flow used by flow-session integration tests',
        visibility: options?.visibility ?? 'public',
        status: 'draft',
        ownerId: options?.ownerId,
        graph,
      },
    });
  }

  async function createSession(
    flowId: string,
    headers: Record<string, string> = {},
  ): Promise<SessionResponseBody> {
    const response = await request(httpServer)
      .post(`/flows/${flowId}/sessions`)
      .set(headers)
      .send()
      .expect(201);

    return response.body as SessionResponseBody;
  }

  async function advanceSession(
    flowId: string,
    sessionId: string,
    body: Record<string, unknown> = {},
    headers: Record<string, string> = {},
  ): Promise<SessionResponseBody> {
    const response = await request(httpServer)
      .post(`/flows/${flowId}/sessions/${sessionId}/advance`)
      .set(headers)
      .send(body)
      .expect(201);

    return response.body as SessionResponseBody;
  }

  it('RUN-001 starts a session on the start node', async () => {
    const flow = await createFlow(numericBranchingGraph());

    const session = await createSession(flow.id);

    expect(session.flowId).toBe(flow.id);
    expect(session.status).toBe('active');
    expect(session.currentNode.id).toBe('start');
    expect(session.currentNode.type).toBe('start');
    expect(session.canGoBack).toBe(false);
    expect(session.answerSummary).toEqual([]);
  });

  it('RUN-002 advances from start node to the next node', async () => {
    const flow = await createFlow(numericBranchingGraph());
    const session = await createSession(flow.id);

    const advancedSession = await advanceSession(flow.id, session.sessionId);

    expect(advancedSession.status).toBe('active');
    expect(advancedSession.currentNode.id).toBe('age-question');
    expect(advancedSession.currentNode.type).toBe('question');
    expect(advancedSession.canGoBack).toBe(true);
  });

  it('RUN-003 rejects single-choice advance without selectedEdgeId when multiple outgoing edges exist', async () => {
    const flow = await createFlow(singleChoiceGraph());
    const session = await createSession(flow.id);

    const questionSession = await advanceSession(flow.id, session.sessionId);

    const response = await request(httpServer)
      .post(`/flows/${flow.id}/sessions/${questionSession.sessionId}/advance`)
      .send()
      .expect(400);

    const responseBody = response.body as ErrorResponseBody;

    expect(responseBody.message).toBe(
      'Multiple outgoing edges found. selectedEdgeId is required.',
    );
  });

  it('RUN-004 advances single-choice question using selectedEdgeId', async () => {
    const flow = await createFlow(singleChoiceGraph());
    const session = await createSession(flow.id);

    const questionSession = await advanceSession(flow.id, session.sessionId);

    const completedSession = await advanceSession(
      flow.id,
      questionSession.sessionId,
      {
        selectedEdgeId: 'edge-yes',
      },
    );

    expect(completedSession.status).toBe('completed');
    expect(completedSession.currentNode.id).toBe('yes-end');
    expect(completedSession.answerSummary).toEqual([
      expect.objectContaining({
        nodeId: 'choice-question',
        questionLabel: 'Choose one',
        questionType: 'singleChoice',
        selectedLabel: 'Yes',
      }),
    ]);
  });

  it('RUN-005 chooses the correct edge for a number question', async () => {
    const flow = await createFlow(numericBranchingGraph());
    const session = await createSession(flow.id);

    const questionSession = await advanceSession(flow.id, session.sessionId);

    const completedSession = await advanceSession(
      flow.id,
      questionSession.sessionId,
      {
        numericValue: 17,
      },
    );

    expect(completedSession.status).toBe('completed');
    expect(completedSession.currentNode.id).toBe('young-end');
    expect(completedSession.answerSummary).toEqual([
      expect.objectContaining({
        nodeId: 'age-question',
        questionLabel: 'How old are you?',
        questionType: 'number',
        numericValue: 17,
        selectedLabel: '< 18',
      }),
    ]);
  });

  it.each([
    {
      testCaseId: 'NUM-009',
      numericValue: 17,
      expectedNodeId: 'young-end',
    },
    {
      testCaseId: 'NUM-010',
      numericValue: 18,
      expectedNodeId: 'adult-end',
    },
    {
      testCaseId: 'NUM-011',
      numericValue: 60,
      expectedNodeId: 'adult-end',
    },
    {
      testCaseId: 'NUM-012',
      numericValue: 61,
      expectedNodeId: 'senior-end',
    },
  ])(
    '$testCaseId chooses the correct numeric branch for value $numericValue',
    async ({ numericValue, expectedNodeId }) => {
      const flow = await createFlow(numericBranchingGraph());
      const session = await createSession(flow.id);

      const questionSession = await advanceSession(flow.id, session.sessionId);

      const completedSession = await advanceSession(
        flow.id,
        questionSession.sessionId,
        {
          numericValue,
        },
      );

      expect(completedSession.status).toBe('completed');
      expect(completedSession.currentNode.id).toBe(expectedNodeId);
    },
  );

  it.each([
    {
      testCaseId: 'NUM-013',
      numericValue: 0,
      expectedNodeId: 'zero-to-hundred-end',
    },
    {
      testCaseId: 'NUM-014',
      numericValue: -1,
      expectedNodeId: 'negative-end',
    },
  ])(
    '$testCaseId chooses the correct zero-boundary branch for value $numericValue',
    async ({ numericValue, expectedNodeId }) => {
      const flow = await createFlow(zeroBoundaryGraph());
      const session = await createSession(flow.id);

      const questionSession = await advanceSession(flow.id, session.sessionId);

      const completedSession = await advanceSession(
        flow.id,
        questionSession.sessionId,
        {
          numericValue,
        },
      );

      expect(completedSession.status).toBe('completed');
      expect(completedSession.currentNode.id).toBe(expectedNodeId);
    },
  );

  it('RUN-006 rejects number question advance without numericValue', async () => {
    const flow = await createFlow(numericBranchingGraph());
    const session = await createSession(flow.id);

    const questionSession = await advanceSession(flow.id, session.sessionId);

    const response = await request(httpServer)
      .post(`/flows/${flow.id}/sessions/${questionSession.sessionId}/advance`)
      .send()
      .expect(400);

    const responseBody = response.body as ErrorResponseBody;

    expect(responseBody.message).toBe(
      'numericValue is required for number questions.',
    );
  });

  it('RUN-007 rejects text question advance without textValue', async () => {
    const flow = await createFlow(textGraph());
    const session = await createSession(flow.id);

    const questionSession = await advanceSession(flow.id, session.sessionId);

    const response = await request(httpServer)
      .post(`/flows/${flow.id}/sessions/${questionSession.sessionId}/advance`)
      .send()
      .expect(400);

    const responseBody = response.body as ErrorResponseBody;

    expect(responseBody.message).toBe(
      'textValue is required for text questions.',
    );
  });

  it('RUN-008 advances text question when textValue is provided', async () => {
    const flow = await createFlow(textGraph());
    const session = await createSession(flow.id);

    const questionSession = await advanceSession(flow.id, session.sessionId);

    const completedSession = await advanceSession(
      flow.id,
      questionSession.sessionId,
      {
        textValue: 'This is a test answer',
      },
    );

    expect(completedSession.status).toBe('completed');
    expect(completedSession.currentNode.id).toBe('end');
    expect(completedSession.answerSummary).toEqual([
      expect.objectContaining({
        nodeId: 'text-question',
        questionLabel: 'Write something',
        questionType: 'text',
        textValue: 'This is a test answer',
      }),
    ]);
  });

  it('RUN-009 goes back to the previous node', async () => {
    const flow = await createFlow(numericBranchingGraph());
    const session = await createSession(flow.id);

    const questionSession = await advanceSession(flow.id, session.sessionId);

    const response = await request(httpServer)
      .post(`/flows/${flow.id}/sessions/${questionSession.sessionId}/back`)
      .send()
      .expect(201);

    const responseBody = response.body as SessionResponseBody;

    expect(responseBody.status).toBe('active');
    expect(responseBody.currentNode.id).toBe('start');
    expect(responseBody.canGoBack).toBe(false);
    expect(responseBody.answerSummary).toEqual([]);
  });

  it('RUN-010 rejects going back when there is no previous step', async () => {
    const flow = await createFlow(numericBranchingGraph());
    const session = await createSession(flow.id);

    const response = await request(httpServer)
      .post(`/flows/${flow.id}/sessions/${session.sessionId}/back`)
      .send()
      .expect(400);

    const responseBody = response.body as ErrorResponseBody;

    expect(responseBody.message).toBe(
      'There is no previous step to go back to.',
    );
  });

  it('RUN-011 marks the session completed when an end node is reached', async () => {
    const flow = await createFlow(numericBranchingGraph());
    const session = await createSession(flow.id);

    const questionSession = await advanceSession(flow.id, session.sessionId);

    const completedSession = await advanceSession(
      flow.id,
      questionSession.sessionId,
      {
        numericValue: 18,
      },
    );

    expect(completedSession.status).toBe('completed');
    expect(completedSession.currentNode.type).toBe('end');
  });

  it('RUN-012 rejects advancing a completed session', async () => {
    const flow = await createFlow(numericBranchingGraph());
    const session = await createSession(flow.id);

    const questionSession = await advanceSession(flow.id, session.sessionId);

    const completedSession = await advanceSession(
      flow.id,
      questionSession.sessionId,
      {
        numericValue: 18,
      },
    );

    const response = await request(httpServer)
      .post(`/flows/${flow.id}/sessions/${completedSession.sessionId}/advance`)
      .send({
        numericValue: 18,
      })
      .expect(400);

    const responseBody = response.body as ErrorResponseBody;

    expect(responseBody.message).toBe('Session is not active.');
  });

  it('RUN-013 rejects advance with a non-existing sessionId', async () => {
    const flow = await createFlow(numericBranchingGraph());

    const response = await request(httpServer)
      .post(`/flows/${flow.id}/sessions/non-existing-session-id/advance`)
      .send()
      .expect(404);

    const responseBody = response.body as ErrorResponseBody;

    expect(responseBody.message).toBe(
      'Session with id non-existing-session-id not found',
    );
  });

  it('RUN-014 rejects advance for a non-existing flowId', async () => {
    const flow = await createFlow(numericBranchingGraph());
    const session = await createSession(flow.id);

    const response = await request(httpServer)
      .post(
        `/flows/00000000-0000-0000-0000-000000000000/sessions/${session.sessionId}/advance`,
      )
      .send()
      .expect(400);

    const responseBody = response.body as ErrorResponseBody;

    expect(responseBody.message).toBe(
      'Session does not belong to the specified flow.',
    );
  });

  it('RUN-015 allows anonymous users to start sessions for public flows', async () => {
    const flow = await createFlow(numericBranchingGraph(), {
      visibility: 'public',
    });

    const session = await createSession(flow.id);

    expect(session.flowId).toBe(flow.id);
    expect(session.currentNode.id).toBe('start');
  });

  it('RUN-016 rejects anonymous session start for private flows', async () => {
    const owner = await createUser('owner@example.com');
    const flow = await createFlow(numericBranchingGraph(), {
      visibility: 'private',
      ownerId: owner.id,
    });

    const response = await request(httpServer)
      .post(`/flows/${flow.id}/sessions`)
      .send()
      .expect(403);

    const responseBody = response.body as ErrorResponseBody;

    expect(responseBody.message).toBe(
      'You do not have access to play this flow',
    );
  });

  it('RUN-017 allows the owner to start sessions for private flows', async () => {
    const owner = await createUser('owner@example.com');
    const flow = await createFlow(numericBranchingGraph(), {
      visibility: 'private',
      ownerId: owner.id,
    });

    const session = await createSession(flow.id, authHeaders(owner));

    expect(session.flowId).toBe(flow.id);
    expect(session.currentNode.id).toBe('start');
  });

  it('RUN-018 allows shared viewers to start sessions for shared flows', async () => {
    const owner = await createUser('owner@example.com');
    const viewer = await createUser('viewer@example.com');

    const flow = await createFlow(numericBranchingGraph(), {
      visibility: 'shared',
      ownerId: owner.id,
    });

    await prisma.flowAccess.create({
      data: {
        flowId: flow.id,
        userId: viewer.id,
        role: 'viewer',
      },
    });

    const session = await createSession(flow.id, authHeaders(viewer));

    expect(session.flowId).toBe(flow.id);
    expect(session.currentNode.id).toBe('start');
  });

  it('RUN-019 rejects anonymous advance for a private flow session', async () => {
    const owner = await createUser('owner@example.com');
    const flow = await createFlow(numericBranchingGraph(), {
      visibility: 'private',
      ownerId: owner.id,
    });

    const session = await createSession(flow.id, authHeaders(owner));

    const response = await request(httpServer)
      .post(`/flows/${flow.id}/sessions/${session.sessionId}/advance`)
      .send()
      .expect(403);

    const responseBody = response.body as ErrorResponseBody;

    expect(responseBody.message).toBe(
      'You do not have access to play this flow',
    );
  });

  it('RUN-020 rejects anonymous back for a private flow session', async () => {
    const owner = await createUser('owner@example.com');
    const flow = await createFlow(numericBranchingGraph(), {
      visibility: 'private',
      ownerId: owner.id,
    });

    const session = await createSession(flow.id, authHeaders(owner));

    const questionSession = await advanceSession(
      flow.id,
      session.sessionId,
      {},
      authHeaders(owner),
    );

    const response = await request(httpServer)
      .post(`/flows/${flow.id}/sessions/${questionSession.sessionId}/back`)
      .send()
      .expect(403);

    const responseBody = response.body as ErrorResponseBody;

    expect(responseBody.message).toBe(
      'You do not have access to play this flow',
    );
  });

  it('RUN-021 rejects multiple choice advance without selectedOptions', async () => {
    const flow = await createFlow(multipleChoiceGraph());
    const session = await createSession(flow.id);

    const questionSession = await advanceSession(flow.id, session.sessionId);

    const response = await request(httpServer)
      .post(`/flows/${flow.id}/sessions/${questionSession.sessionId}/advance`)
      .send()
      .expect(400);

    const responseBody = response.body as ErrorResponseBody;

    expect(responseBody.message).toBe(
      'selectedOptions is required for multiple choice questions.',
    );
  });

  it('RUN-022 advances multiple choice question when selectedOptions are provided', async () => {
    const flow = await createFlow(multipleChoiceGraph());
    const session = await createSession(flow.id);

    const questionSession = await advanceSession(flow.id, session.sessionId);

    const completedSession = await advanceSession(
      flow.id,
      questionSession.sessionId,
      {
        selectedOptions: ['Option A', 'Option C'],
      },
    );

    expect(completedSession.status).toBe('completed');
    expect(completedSession.currentNode.id).toBe('end');
    expect(completedSession.answerSummary).toEqual([
      expect.objectContaining({
        nodeId: 'multiple-choice-question',
        questionLabel: 'Choose multiple options',
        questionType: 'multipleChoice',
        selectedOptions: ['Option A', 'Option C'],
      }),
    ]);

    const storedSession = await prisma.flowSession.findUniqueOrThrow({
      where: {
        id: completedSession.sessionId,
      },
    });

    const context = storedSession.context as StoredSessionContext;
    const answer = context.answers?.find(
      (entry) => entry.nodeId === 'multiple-choice-question',
    );

    expect(answer?.selectedOptions).toEqual(['Option A', 'Option C']);
  });

  it('RUN-023 rejects multiple choice advance with an invalid option', async () => {
    const flow = await createFlow(multipleChoiceGraph());
    const session = await createSession(flow.id);

    const questionSession = await advanceSession(flow.id, session.sessionId);

    const response = await request(httpServer)
      .post(`/flows/${flow.id}/sessions/${questionSession.sessionId}/advance`)
      .send({
        selectedOptions: ['Option A', 'Invalid option'],
      })
      .expect(400);

    const responseBody = response.body as ErrorResponseBody;

    expect(responseBody.message).toBe(
      'selectedOptions contains values that are not valid options for this question.',
    );
  });
});
