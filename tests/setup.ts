import { beforeAll, afterAll, beforeEach } from '@jest/globals';

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/test';
});

afterAll(async () => {
  // Global cleanup
});

beforeEach(() => {
  // Reset any global state before each test
});