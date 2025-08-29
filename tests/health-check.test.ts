import { describe, test, expect } from '@jest/globals';

describe('Health Check Tests', () => {
  test('Jest is working correctly', () => {
    expect(true).toBe(true);
  });

  test('Environment variables are accessible', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });

  test('Database URL is configured', () => {
    expect(process.env.DATABASE_URL).toBeDefined();
  });

  test('Math operations work', () => {
    expect(2 + 2).toBe(4);
    expect('hello'.toUpperCase()).toBe('HELLO');
  });
});