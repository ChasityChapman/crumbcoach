import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../server/routes';

let app: express.Express;
let server: any;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  server = await registerRoutes(app);
});

afterAll(async () => {
  if (server) {
    server.close();
  }
});

describe('Authentication Routes', () => {
  test('GET /api/health returns healthy status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body.status).toBe('healthy');
    expect(response.body.environment).toBeDefined();
    expect(response.body.version).toBe('1.0.0');
  });

  test('POST /api/register creates new user with valid data', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User'
    };

    const response = await request(app)
      .post('/api/register')
      .send(userData)
      .expect(201);

    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe(userData.email);
    expect(response.body.user.username).toBe(userData.username);
    expect(response.body.user.password).toBeUndefined(); // Password should not be returned
  });

  test('POST /api/register rejects duplicate email', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      username: 'testuser2'
    };

    await request(app)
      .post('/api/register')
      .send(userData)
      .expect(400);
  });

  test('POST /api/register validates required fields', async () => {
    const incompleteData = {
      email: 'invalid-email',
      password: '123' // Too short
    };

    const response = await request(app)
      .post('/api/register')
      .send(incompleteData)
      .expect(400);

    expect(response.body.error).toBeDefined();
  });

  test('POST /api/login authenticates valid user', async () => {
    const loginData = {
      email: 'test@example.com',
      password: 'password123'
    };

    const response = await request(app)
      .post('/api/login')
      .send(loginData)
      .expect(200);

    expect(response.body.token).toBeDefined();
    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe(loginData.email);
  });

  test('POST /api/login rejects invalid credentials', async () => {
    const invalidLogin = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };

    await request(app)
      .post('/api/login')
      .send(invalidLogin)
      .expect(401);
  });

  test('POST /api/forgot-password accepts valid email', async () => {
    const resetData = {
      email: 'test@example.com'
    };

    const response = await request(app)
      .post('/api/forgot-password')
      .send(resetData)
      .expect(200);

    expect(response.body.message).toBe('Password reset email sent');
  });
});