#!/usr/bin/env node

/**
 * Security Testing Script
 * Tests JWT authentication, rate limiting, and security features
 */

const axios = require('axios');
const BASE_URL = 'http://localhost:5000';

// Test configuration
const TEST_USER = {
  email: 'security-test@example.com',
  password: 'TestPassword123!',
  username: 'sectest',
  firstName: 'Security',
  lastName: 'Tester'
};

class SecurityTester {
  constructor() {
    this.tokens = null;
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runTest(name, testFn) {
    console.log(`🧪 Running: ${name}`);
    try {
      await testFn();
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASS' });
      console.log(`✅ ${name} - PASSED`);
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAIL', error: error.message });
      console.log(`❌ ${name} - FAILED: ${error.message}`);
    }
    console.log('');
  }

  async testHealthCheck() {
    const response = await axios.get(`${BASE_URL}/api/health`);
    if (response.status !== 200) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    if (!response.data.status || response.data.status !== 'healthy') {
      throw new Error('Health status not healthy');
    }
  }

  async testUserRegistration() {
    const response = await axios.post(`${BASE_URL}/api/register`, TEST_USER);
    if (response.status !== 201) {
      throw new Error(`Registration failed: ${response.status}`);
    }
    if (!response.data.tokens || !response.data.tokens.accessToken) {
      throw new Error('No access token returned');
    }
    this.tokens = response.data.tokens;
  }

  async testUserLogin() {
    const response = await axios.post(`${BASE_URL}/api/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    if (response.status !== 200) {
      throw new Error(`Login failed: ${response.status}`);
    }
    if (!response.data.tokens || !response.data.tokens.accessToken) {
      throw new Error('No access token returned');
    }
    this.tokens = response.data.tokens;
  }

  async testJWTAuthentication() {
    if (!this.tokens) {
      throw new Error('No tokens available for testing');
    }

    // Test valid token
    const response = await axios.delete(`${BASE_URL}/api/delete-account`, {
      headers: {
        'Authorization': `Bearer ${this.tokens.accessToken}`
      }
    });
    
    // We expect this to work (user should be authenticated)
    // The actual deletion might fail for business logic reasons, but auth should pass
    if (response.status === 401) {
      throw new Error('Valid JWT token was rejected');
    }
  }

  async testInvalidJWT() {
    try {
      await axios.get(`${BASE_URL}/api/recipes`, {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });
      throw new Error('Invalid token was accepted');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        // This is expected
        return;
      }
      throw error;
    }
  }

  async testMissingJWT() {
    try {
      await axios.delete(`${BASE_URL}/api/delete-account`);
      throw new Error('Request without token was accepted');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        // This is expected
        return;
      }
      throw error;
    }
  }

  async testTokenRefresh() {
    if (!this.tokens) {
      throw new Error('No tokens available for testing');
    }

    const response = await axios.post(`${BASE_URL}/api/refresh-token`, {
      refreshToken: this.tokens.refreshToken
    });

    if (response.status !== 200) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }
    if (!response.data.tokens || !response.data.tokens.accessToken) {
      throw new Error('No new access token returned');
    }
  }

  async testRateLimit() {
    const promises = [];
    // Try to make 10 rapid login attempts to trigger rate limiting
    for (let i = 0; i < 10; i++) {
      promises.push(
        axios.post(`${BASE_URL}/api/login`, {
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        }).catch(error => error.response)
      );
    }

    const responses = await Promise.all(promises);
    const rateLimitedResponses = responses.filter(r => r && r.status === 429);
    
    if (rateLimitedResponses.length === 0) {
      throw new Error('Rate limiting not working - no 429 responses');
    }
  }

  async testSecurityHeaders() {
    const response = await axios.get(`${BASE_URL}/api/health`);
    const headers = response.headers;
    
    const requiredHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection'
    ];
    
    for (const header of requiredHeaders) {
      if (!headers[header]) {
        throw new Error(`Missing security header: ${header}`);
      }
    }
  }

  async testSuspiciousRequest() {
    try {
      await axios.post(`${BASE_URL}/api/register`, {
        email: 'test@example.com',
        password: '<script>alert("xss")</script>',
        username: 'test'
      });
      throw new Error('Suspicious request was not blocked');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        // Expected - request should be blocked
        return;
      }
      throw error;
    }
  }

  async testRequestSizeLimit() {
    const largePayload = 'x'.repeat(11 * 1024 * 1024); // 11MB payload
    try {
      await axios.post(`${BASE_URL}/api/register`, {
        email: 'test@example.com',
        password: 'password',
        largeField: largePayload
      });
      throw new Error('Large request was not blocked');
    } catch (error) {
      if (error.response && (error.response.status === 413 || error.response.status === 400)) {
        // Expected - request should be blocked
        return;
      }
      throw error;
    }
  }

  async testMetricsEndpoint() {
    const response = await axios.get(`${BASE_URL}/api/metrics`);
    if (response.status !== 200) {
      throw new Error(`Metrics endpoint failed: ${response.status}`);
    }
    
    const metrics = response.data;
    if (!metrics.totalRequests || typeof metrics.totalRequests !== 'number') {
      throw new Error('Invalid metrics data');
    }
  }

  async runAllTests() {
    console.log('🔐 Starting Security Test Suite\n');
    console.log('=' .repeat(50));

    await this.runTest('Health Check', () => this.testHealthCheck());
    await this.runTest('User Registration with JWT', () => this.testUserRegistration());
    await this.runTest('User Login with JWT', () => this.testUserLogin());
    await this.runTest('JWT Authentication', () => this.testJWTAuthentication());
    await this.runTest('Invalid JWT Rejection', () => this.testInvalidJWT());
    await this.runTest('Missing JWT Rejection', () => this.testMissingJWT());
    await this.runTest('Token Refresh', () => this.testTokenRefresh());
    await this.runTest('Rate Limiting', () => this.testRateLimit());
    await this.runTest('Security Headers', () => this.testSecurityHeaders());
    await this.runTest('Suspicious Request Blocking', () => this.testSuspiciousRequest());
    await this.runTest('Request Size Limiting', () => this.testRequestSizeLimit());
    await this.runTest('Metrics Endpoint', () => this.testMetricsEndpoint());

    console.log('=' .repeat(50));
    console.log('📊 Test Results:');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests
        .filter(test => test.status === 'FAIL')
        .forEach(test => {
          console.log(`  - ${test.name}: ${test.error}`);
        });
    }

    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

// Check if server is running
async function checkServerHealth() {
  try {
    await axios.get(`${BASE_URL}/api/health`);
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🚀 Checking if server is running...');
  const isServerRunning = await checkServerHealth();
  
  if (!isServerRunning) {
    console.error('❌ Server is not running. Please start the server first:');
    console.error('   npm run dev');
    process.exit(1);
  }

  console.log('✅ Server is running. Starting tests...\n');

  const tester = new SecurityTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = SecurityTester;