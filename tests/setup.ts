import { beforeAll, afterAll, beforeEach } from '@jest/globals';
import 'dotenv/config';

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Use production Supabase database for tests (or set up a test database)
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://postgres:Hjamesp1!@db.uwddmnpmmmxhbktnyesx.supabase.co:5432/postgres';
  }
  
  // Set up Supabase test environment
  process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3ZGRtbnBtbW14aGJrdG55ZXN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMjkwNTMsImV4cCI6MjA3MTkwNTA1M30.yfHi8KtHsRollZ5IoLpWJVSYaVraPPea1KETW8dto7Q';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3ZGRtbnBtbW14aGJrdG55ZXN4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjMyOTA1MywiZXhwIjoyMDcxOTA1MDUzfQ.VVryBQkTazfnGSEKyRc36tUgGWFn0McZ1zUptI3Sd3Y';
  
  // Set security configuration
  process.env.SESSION_SECRET = 'test-session-secret';
  process.env.METRICS_TOKEN = 'test-metrics-token';
});

afterAll(async () => {
  // Global cleanup
});

beforeEach(() => {
  // Reset any global state before each test
});