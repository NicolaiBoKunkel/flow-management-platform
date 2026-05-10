import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import type { Server } from 'http';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

type AuthResponseBody = {
  message: string;
  accessToken: string;
  user: {
    id: string;
    email: string;
  };
};

type MeResponseBody = {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

type ErrorResponseBody = {
  message?: string | string[];
};

describe('Auth integration', () => {
  let app: INestApplication;
  let httpServer: Server;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-jwt-secret';

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: process.env.JWT_SECRET,
          signOptions: {
            expiresIn: '7d',
          },
        }),
      ],
      controllers: [AuthController],
      providers: [AuthService, PrismaService, JwtAuthGuard],
    }).compile();

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

  async function registerUser(
    email = 'user@example.com',
    password = 'password123',
  ) {
    const response = await request(httpServer)
      .post('/auth/register')
      .send({
        email,
        password,
      })
      .expect(201);

    return response.body as AuthResponseBody;
  }

  it('AUTH-001 registers a user and returns an access token', async () => {
    const responseBody = await registerUser();

    expect(responseBody.message).toBe('User registered successfully');
    expect(responseBody.accessToken).toEqual(expect.any(String));
    expect(responseBody.user.email).toBe('user@example.com');

    const storedUser = await prisma.user.findUnique({
      where: {
        email: 'user@example.com',
      },
    });

    expect(storedUser).not.toBeNull();
    expect(storedUser?.password).not.toBe('password123');
  });

  it('AUTH-002 rejects duplicate registration email', async () => {
    await registerUser('duplicate@example.com', 'password123');

    const response = await request(httpServer)
      .post('/auth/register')
      .send({
        email: 'duplicate@example.com',
        password: 'password123',
      })
      .expect(409);

    const responseBody = response.body as ErrorResponseBody;

    expect(responseBody.message).toBe('A user with that email already exists');
  });

  it('AUTH-003 logs in with correct credentials', async () => {
    await registerUser('login@example.com', 'password123');

    const response = await request(httpServer)
      .post('/auth/login')
      .send({
        email: 'login@example.com',
        password: 'password123',
      })
      .expect(201);

    const responseBody = response.body as AuthResponseBody;

    expect(responseBody.message).toBe('Login successful');
    expect(responseBody.accessToken).toEqual(expect.any(String));
    expect(responseBody.user.email).toBe('login@example.com');
  });

  it('AUTH-004 rejects login with wrong password', async () => {
    await registerUser('wrong-password@example.com', 'password123');

    const response = await request(httpServer)
      .post('/auth/login')
      .send({
        email: 'wrong-password@example.com',
        password: 'wrong-password',
      })
      .expect(401);

    const responseBody = response.body as ErrorResponseBody;

    expect(responseBody.message).toBe('Invalid email or password');
  });

  it('AUTH-005 returns current user from /auth/me with a valid token', async () => {
    const registeredUser = await registerUser('me@example.com', 'password123');

    const response = await request(httpServer)
      .get('/auth/me')
      .set('Authorization', `Bearer ${registeredUser.accessToken}`)
      .expect(200);

    const responseBody = response.body as MeResponseBody;

    expect(responseBody.id).toBe(registeredUser.user.id);
    expect(responseBody.email).toBe('me@example.com');
    expect(responseBody.createdAt).toEqual(expect.any(String));
    expect(responseBody.updatedAt).toEqual(expect.any(String));
  });

  it('AUTH-006 rejects /auth/me without token', async () => {
    const response = await request(httpServer).get('/auth/me').expect(401);

    const responseBody = response.body as ErrorResponseBody;

    expect(responseBody.message).toBe(
      'Missing or invalid authorization header',
    );
  });

  it('AUTH-007 rejects invalid register payload', async () => {
    const response = await request(httpServer)
      .post('/auth/register')
      .send({
        email: 'not-an-email',
        password: '123',
      })
      .expect(400);

    const responseBody = response.body as ErrorResponseBody;

    expect(Array.isArray(responseBody.message)).toBe(true);
  });
});
