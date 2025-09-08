import { beforeAll, afterAll, beforeEach } from '@jest/globals';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load test environment variables
config({ path: resolve(process.cwd(), '.env.test') });

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Validate required environment variables
  const requiredEnvVars = [
    'DATABASE_URL',
    'SUPABASE_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required test environment variables: ${missingVars.join(', ')}\n` +
      'Please set these in your .env.test file or environment.'
    );
  }
  
  // Set default test security configuration if not provided
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = 'test-session-secret-change-in-production';
  }
  
  if (!process.env.METRICS_TOKEN) {
    process.env.METRICS_TOKEN = 'test-metrics-token-change-in-production';
  }
});

afterAll(async () => {
  // Global cleanup
});

beforeEach(() => {
  // Reset any global state before each test
});