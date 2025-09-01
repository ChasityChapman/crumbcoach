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

describe('Basic Route Tests', () => {
  test('GET /api/health returns healthy status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body.status).toBe('healthy');
    expect(response.body.environment).toBeDefined();
    expect(response.body.version).toBe('1.0.0');
  });

  test('GET /api/metrics requires authentication in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    const response = await request(app)
      .get('/api/metrics');
    
    // Should return 401 without proper token in production
    expect(response.status).toBe(401);
    
    // Restore original env
    process.env.NODE_ENV = originalEnv;
  });

  test('GET /api/metrics returns data in development', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    const response = await request(app)
      .get('/api/metrics')
      .expect(200);
    
    expect(response.body).toBeDefined();
    expect(typeof response.body).toBe('object');
    
    // Restore original env
    process.env.NODE_ENV = originalEnv;
  });

  test('POST /api/auth/register requires email and password', async () => {
    const incompleteData = {
      username: 'testuser'
      // Missing email and password
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(incompleteData);

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });

  test('POST /api/auth/login requires email and password', async () => {
    const incompleteData = {
      email: 'test@example.com'
      // Missing password
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(incompleteData);

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });

  test('POST /api/auth/forgot-password requires email', async () => {
    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });

  test('POST /api/auth/forgot-password validates email format', async () => {
    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'invalid-email' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid email format');
  });
});