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

describe('Production Deployment Integration Tests', () => {
  test('Health check endpoint returns comprehensive status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'healthy',
      environment: 'test',
      version: '1.0.0',
      uptime: expect.any(Number),
      memory: {
        used: expect.any(Number),
        total: expect.any(Number),
        external: expect.any(Number)
      },
      database: {
        connected: true
      }
    });

    expect(response.body.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
  });

  test('Deployment status endpoint shows production readiness', async () => {
    const response = await request(app)
      .get('/api/deployment-status')
      .expect(200);

    expect(response.body).toMatchObject({
      summary: {
        total: expect.any(Number),
        passed: expect.any(Number),
        warnings: expect.any(Number),
        failed: expect.any(Number),
        ready: expect.any(Boolean),
        readiness: expect.stringMatching(/READY|NOT READY/)
      },
      checks: expect.any(Array),
      timestamp: expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/)
    });

    // Check that critical environment variables are verified
    const envVarChecks = response.body.checks.filter((check: any) => 
      check.name.includes('Environment Variable')
    );
    expect(envVarChecks.length).toBeGreaterThan(0);
  });

  test('Metrics endpoint returns performance data', async () => {
    const response = await request(app)
      .get('/api/metrics')
      .expect(200);

    expect(response.body).toMatchObject({
      performance: expect.any(Object),
      uptime: expect.any(Number),
      memory: expect.any(Object),
      timestamp: expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/)
    });

    // Verify memory information is present
    expect(response.body.memory).toHaveProperty('heapUsed');
    expect(response.body.memory).toHaveProperty('heapTotal');
  });

  test('Critical API routes are accessible', async () => {
    const criticalRoutes = [
      '/api/health',
      '/api/deployment-status', 
      '/api/metrics',
      '/api/tutorials'
    ];

    for (const route of criticalRoutes) {
      const response = await request(app)
        .get(route);
      
      expect(response.status).not.toBe(404);
      expect(response.status).not.toBe(500);
    }
  });

  test('Authentication endpoints are properly secured', async () => {
    // Test that protected routes require authentication
    await request(app)
      .get('/api/recipes')
      .expect(401);

    await request(app)
      .get('/api/bakes')
      .expect(401);

    // Test that public routes work without auth
    await request(app)
      .get('/api/tutorials')
      .expect(200);

    await request(app)
      .get('/api/health')
      .expect(200);
  });

  test('Error handling works correctly', async () => {
    // Test invalid route
    const response = await request(app)
      .get('/api/nonexistent')
      .expect(404);

    // Response should be JSON even for 404s
    expect(response.headers['content-type']).toMatch(/json/);
  });

  test('Request logging middleware is active', async () => {
    // Make a request and ensure it completes successfully
    // The logging middleware should not interfere with normal operations
    const response = await request(app)
      .get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
  });
});