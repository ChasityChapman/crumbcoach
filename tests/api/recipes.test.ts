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
    email: 'recipetest@example.com',
    password: 'password123',
    username: 'recipeuser'
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

describe('Recipe Routes', () => {
  test('GET /api/recipes requires authentication', async () => {
    await request(app)
      .get('/api/recipes')
      .expect(401);
  });

  test('GET /api/recipes returns empty array for new user', async () => {
    const response = await request(app)
      .get('/api/recipes')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(response.body).toEqual([]);
  });

  test('POST /api/recipes creates new recipe', async () => {
    const recipeData = {
      name: 'Basic Sourdough',
      description: 'A simple sourdough recipe',
      ingredients: [
        { name: 'Flour', amount: 500, unit: 'grams' },
        { name: 'Water', amount: 350, unit: 'grams' },
        { name: 'Starter', amount: 100, unit: 'grams' },
        { name: 'Salt', amount: 10, unit: 'grams' }
      ],
      steps: [
        { instruction: 'Mix ingredients', duration: 10 },
        { instruction: 'Knead dough', duration: 15 },
        { instruction: 'First rise', duration: 240 }
      ],
      totalTime: 1440,
      difficulty: 'beginner',
      yield: '1 loaf'
    };

    const response = await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${userToken}`)
      .send(recipeData)
      .expect(201);

    expect(response.body.name).toBe(recipeData.name);
    expect(response.body.ingredients).toHaveLength(4);
    expect(response.body.steps).toHaveLength(3);
  });

  test('POST /api/recipes validates required fields', async () => {
    const incompleteRecipe = {
      name: 'Incomplete Recipe'
      // Missing required fields
    };

    await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${userToken}`)
      .send(incompleteRecipe)
      .expect(400);
  });

  test('GET /api/recipes returns created recipes', async () => {
    const response = await request(app)
      .get('/api/recipes')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('Basic Sourdough');
  });

  test('PUT /api/recipes/:id updates recipe', async () => {
    // First get the recipe ID
    const recipesResponse = await request(app)
      .get('/api/recipes')
      .set('Authorization', `Bearer ${userToken}`);

    const recipeId = recipesResponse.body[0].id;

    const updatedData = {
      name: 'Updated Sourdough',
      description: 'An updated description'
    };

    const response = await request(app)
      .put(`/api/recipes/${recipeId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send(updatedData)
      .expect(200);

    expect(response.body.name).toBe(updatedData.name);
    expect(response.body.description).toBe(updatedData.description);
  });

  test('DELETE /api/recipes/:id removes recipe', async () => {
    // First get the recipe ID
    const recipesResponse = await request(app)
      .get('/api/recipes')
      .set('Authorization', `Bearer ${userToken}`);

    const recipeId = recipesResponse.body[0].id;

    await request(app)
      .delete(`/api/recipes/${recipeId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    // Verify recipe is deleted
    const afterDeleteResponse = await request(app)
      .get('/api/recipes')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(afterDeleteResponse.body).toHaveLength(0);
  });
});