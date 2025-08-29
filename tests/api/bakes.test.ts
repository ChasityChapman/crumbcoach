import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../server/routes';

let app: express.Express;
let server: any;
let userToken: string;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  server = await registerRoutes(app);

  // Create a test user and get token
  const userData = {
    email: 'baketest@example.com',
    password: 'password123',
    username: 'bakeuser'
  };

  await request(app)
    .post('/api/register')
    .send(userData);

  const loginResponse = await request(app)
    .post('/api/login')
    .send({ email: userData.email, password: userData.password });

  userToken = loginResponse.body.token;
});

afterAll(async () => {
  if (server) {
    server.close();
  }
});

describe('Bake Routes', () => {
  test('GET /api/bakes requires authentication', async () => {
    await request(app)
      .get('/api/bakes')
      .expect(401);
  });

  test('POST /api/bakes creates new bake', async () => {
    const bakeData = {
      name: 'Test Sourdough Bake',
      recipeId: null,
      status: 'active',
      startTime: new Date().toISOString(),
      environmentalConditions: {
        temperature: 72,
        humidity: 65
      },
      notes: 'First test bake'
    };

    const response = await request(app)
      .post('/api/bakes')
      .set('Authorization', `Bearer ${userToken}`)
      .send(bakeData)
      .expect(201);

    expect(response.body.name).toBe(bakeData.name);
    expect(response.body.status).toBe('active');
    expect(response.body.environmentalConditions).toEqual(bakeData.environmentalConditions);
  });

  test('GET /api/bakes returns created bakes', async () => {
    const response = await request(app)
      .get('/api/bakes')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('Test Sourdough Bake');
  });

  test('PATCH /api/bakes/:id updates bake status', async () => {
    // Get the bake ID
    const bakesResponse = await request(app)
      .get('/api/bakes')
      .set('Authorization', `Bearer ${userToken}`);

    const bakeId = bakesResponse.body[0].id;

    const updateData = {
      status: 'completed',
      endTime: new Date().toISOString(),
      finalResult: {
        crumbStructure: 'excellent',
        crust: 'golden brown',
        overall: 'success'
      }
    };

    const response = await request(app)
      .patch(`/api/bakes/${bakeId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send(updateData)
      .expect(200);

    expect(response.body.status).toBe('completed');
    expect(response.body.finalResult).toEqual(updateData.finalResult);
  });

  test('DELETE /api/bakes/:id removes bake', async () => {
    // Get the bake ID
    const bakesResponse = await request(app)
      .get('/api/bakes')
      .set('Authorization', `Bearer ${userToken}`);

    const bakeId = bakesResponse.body[0].id;

    await request(app)
      .delete(`/api/bakes/${bakeId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    // Verify bake is deleted
    const afterDeleteResponse = await request(app)
      .get('/api/bakes')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(afterDeleteResponse.body).toHaveLength(0);
  });
});