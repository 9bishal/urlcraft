#!/usr/bin/env node

/**
 * Load Testing Script for URLCraft
 * Tests concurrent user capacity and request throughput
 * 
 * Usage:
 *   node load-test.js
 * 
 * Tests:
 *   - Registration under load
 *   - Login under load
 *   - URL shortening under load
 *   - Concurrent requests
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const PORT = 3000;
const HOST = 'localhost';

// Configuration
const CONFIG = {
  concurrentUsers: [10, 50, 100, 200],  // Test with increasing concurrent users
  requestsPerUser: 5,                     // Each user makes 5 requests
  rampUpTime: 2000,                       // Ramp up over 2 seconds
};

// Test Results
const results = {
  registrations: [],
  logins: [],
  shortenings: [],
  redirects: [],
};

// Helper: Make HTTP request
function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const options = {
      hostname: HOST,
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        try {
          const parsed = JSON.parse(data);
          resolve({
            status: res.statusCode,
            duration,
            data: parsed,
            success: res.statusCode >= 200 && res.statusCode < 300,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            duration,
            data: data,
            success: res.statusCode >= 200 && res.statusCode < 300,
          });
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

// Test: Register users
async function testRegistration(concurrentCount) {
  console.log(`\n📝 Testing Registration with ${concurrentCount} concurrent users...`);
  
  const promises = [];
  const startTime = Date.now();

  for (let i = 0; i < concurrentCount; i++) {
    const username = `user_${Date.now()}_${i}`;
    const email = `${username}@test.com`;
    const password = 'password123';

    const promise = makeRequest('POST', '/auth/register', {
      username,
      email,
      password,
    }).then(result => ({
      ...result,
      operation: 'register',
      user: username,
    }));

    promises.push(promise);
  }

  const responses = await Promise.allSettled(promises);
  const duration = Date.now() - startTime;
  const successful = responses.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = responses.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
  const avgResponseTime = responses
    .filter(r => r.status === 'fulfilled')
    .reduce((sum, r) => sum + r.value.duration, 0) / responses.length;

  const result = {
    concurrentUsers: concurrentCount,
    totalRequests: concurrentCount,
    successful,
    failed,
    totalDuration: duration,
    throughput: (concurrentCount / (duration / 1000)).toFixed(2),
    avgResponseTime: avgResponseTime.toFixed(2),
  };

  results.registrations.push(result);
  return { result, responses };
}

// Test: Login users
async function testLogin(concurrentCount, tokens = []) {
  console.log(`\n🔐 Testing Login with ${concurrentCount} concurrent users...`);
  
  const promises = [];
  const startTime = Date.now();

  for (let i = 0; i < concurrentCount; i++) {
    const username = `testuser_${i}`;
    const password = 'password123';

    const promise = makeRequest('POST', '/auth/login', {
      username,
      password,
    }).catch(err => ({
      status: 0,
      duration: Date.now() - startTime,
      success: false,
      error: err.message,
    }));

    promises.push(promise);
  }

  const responses = await Promise.allSettled(promises);
  const duration = Date.now() - startTime;
  const successful = responses.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = responses.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
  const avgResponseTime = responses
    .filter(r => r.status === 'fulfilled')
    .reduce((sum, r) => sum + r.value.duration, 0) / responses.length;

  const result = {
    concurrentUsers: concurrentCount,
    totalRequests: concurrentCount,
    successful,
    failed,
    totalDuration: duration,
    throughput: (concurrentCount / (duration / 1000)).toFixed(2),
    avgResponseTime: avgResponseTime.toFixed(2),
  };

  results.logins.push(result);
  return { result, responses };
}

// Test: URL Shortening under load
async function testShortening(concurrentCount, token) {
  console.log(`\n🔗 Testing URL Shortening with ${concurrentCount} concurrent users...`);
  
  const promises = [];
  const startTime = Date.now();

  for (let i = 0; i < concurrentCount; i++) {
    const longUrl = `https://example.com/very/long/url/path/${i}?param1=value1&param2=value2`;

    const promise = makeRequest('POST', '/shorten', {
      longUrl,
      expiresIn: '24h',
    }, {
      'Authorization': `Bearer ${token}`,
    }).catch(err => ({
      status: 0,
      duration: Date.now() - startTime,
      success: false,
      error: err.message,
    }));

    promises.push(promise);
  }

  const responses = await Promise.allSettled(promises);
  const duration = Date.now() - startTime;
  const successful = responses.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = responses.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
  const avgResponseTime = responses
    .filter(r => r.status === 'fulfilled')
    .reduce((sum, r) => sum + r.value.duration, 0) / responses.length;

  const result = {
    concurrentUsers: concurrentCount,
    totalRequests: concurrentCount,
    successful,
    failed,
    totalDuration: duration,
    throughput: (concurrentCount / (duration / 1000)).toFixed(2),
    avgResponseTime: avgResponseTime.toFixed(2),
  };

  results.shortenings.push(result);
  return { result, responses };
}

// Test: URL Redirects under load
async function testRedirects(concurrentCount, shortCodes = []) {
  console.log(`\n↩️  Testing URL Redirects with ${concurrentCount} concurrent requests...`);
  
  const promises = [];
  const startTime = Date.now();

  // Use random short codes or generate new ones
  for (let i = 0; i < concurrentCount; i++) {
    const shortCode = shortCodes[i % shortCodes.length] || `test${i}`;

    const promise = makeRequest('GET', `/${shortCode}`, null, {})
      .catch(err => ({
        status: 0,
        duration: Date.now() - startTime,
        success: false,
        error: err.message,
      }));

    promises.push(promise);
  }

  const responses = await Promise.allSettled(promises);
  const duration = Date.now() - startTime;
  const successful = responses.filter(r => r.status === 'fulfilled' && (r.value.status === 301 || r.value.status === 404)).length;
  const failed = responses.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.status >= 500)).length;
  const avgResponseTime = responses
    .filter(r => r.status === 'fulfilled')
    .reduce((sum, r) => sum + r.value.duration, 0) / responses.length;

  const result = {
    concurrentUsers: concurrentCount,
    totalRequests: concurrentCount,
    successful,
    failed,
    totalDuration: duration,
    throughput: (concurrentCount / (duration / 1000)).toFixed(2),
    avgResponseTime: avgResponseTime.toFixed(2),
  };

  results.redirects.push(result);
  return { result, responses };
}

// Print results table
function printResultsTable(testName, data) {
  console.log(`\n📊 ${testName} Results:`);
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ Concurrent │ Total   │ Success │ Failed │ Duration │ Throughput │ Avg Time │');
  console.log('│ Users       │ Requests│         │        │ (ms)     │ (req/sec)  │ (ms)     │');
  console.log('├─────────────────────────────────────────────────────────────────┤');
  
  data.forEach(row => {
    const userStr = String(row.concurrentUsers).padEnd(11);
    const requestStr = String(row.totalRequests).padEnd(8);
    const successStr = String(row.successful).padEnd(8);
    const failedStr = String(row.failed).padEnd(7);
    const durationStr = String(row.totalDuration).padEnd(9);
    const throughputStr = String(row.throughput).padEnd(11);
    const avgStr = String(row.avgResponseTime).padEnd(9);
    
    console.log(`│ ${userStr}│ ${requestStr}│ ${successStr}│ ${failedStr}│ ${durationStr}│ ${throughputStr}│ ${avgStr}│`);
  });
  
  console.log('└─────────────────────────────────────────────────────────────────┘');
}

// Main test runner
async function runLoadTests() {
  console.log('🚀 URLCraft Load Testing Suite');
  console.log('==============================');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  try {
    // Test 1: Registration Load Test
    console.log('\n▶️  PHASE 1: REGISTRATION LOAD TEST');
    console.log('==================================');
    for (const count of CONFIG.concurrentUsers) {
      await testRegistration(count);
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause between tests
    }

    // Test 2: Login Load Test (simplified - might fail due to non-existent users)
    console.log('\n\n▶️  PHASE 2: LOGIN LOAD TEST');
    console.log('=============================');
    for (const count of CONFIG.concurrentUsers.slice(0, 2)) {
      await testLogin(count);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Test 3: URL Shortening (needs valid token)
    console.log('\n\n▶️  PHASE 3: URL SHORTENING LOAD TEST');
    console.log('======================================');
    
    // First, create a test user to get a token
    const registerRes = await makeRequest('POST', '/auth/register', {
      username: `loadtest_${Date.now()}`,
      email: `loadtest_${Date.now()}@test.com`,
      password: 'password123',
    });

    if (registerRes.success && registerRes.data.accessToken) {
      const token = registerRes.data.accessToken;
      for (const count of CONFIG.concurrentUsers) {
        await testShortening(count, token);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } else {
      console.log('⚠️  Could not create test user for shortening tests');
    }

    // Test 4: Redirect Load Test
    console.log('\n\n▶️  PHASE 4: URL REDIRECT LOAD TEST');
    console.log('====================================');
    for (const count of CONFIG.concurrentUsers) {
      await testRedirects(count, ['test', 'github', 'google']);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Print all results
    console.log('\n\n📈 LOAD TEST RESULTS SUMMARY');
    console.log('=============================\n');

    printResultsTable('REGISTRATION', results.registrations);
    printResultsTable('LOGIN', results.logins);
    printResultsTable('URL SHORTENING', results.shortenings);
    printResultsTable('URL REDIRECTS', results.redirects);

    // Calculate and print statistics
    console.log('\n📊 KEY METRICS:');
    console.log('================');

    const registrationThroughput = results.registrations[results.registrations.length - 1]?.throughput || 'N/A';
    const shorteningThroughput = results.shortenings[results.shortenings.length - 1]?.throughput || 'N/A';
    const redirectThroughput = results.redirects[results.redirects.length - 1]?.throughput || 'N/A';

    console.log(`\n✅ Max Registration Throughput: ${registrationThroughput} requests/sec`);
    console.log(`✅ Max Shortening Throughput: ${shorteningThroughput} requests/sec`);
    console.log(`✅ Max Redirect Throughput: ${redirectThroughput} requests/sec`);

    const avgRegTime = (results.registrations.reduce((sum, r) => sum + parseFloat(r.avgResponseTime), 0) / results.registrations.length).toFixed(2);
    const avgShortenTime = (results.shortenings.reduce((sum, r) => sum + parseFloat(r.avgResponseTime), 0) / results.shortenings.length).toFixed(2);
    const avgRedirectTime = (results.redirects.reduce((sum, r) => sum + parseFloat(r.avgResponseTime), 0) / results.redirects.length).toFixed(2);

    console.log(`\n⏱️  Avg Registration Time: ${avgRegTime}ms`);
    console.log(`⏱️  Avg Shortening Time: ${avgShortenTime}ms`);
    console.log(`⏱️  Avg Redirect Time: ${avgRedirectTime}ms`);

    console.log('\n✅ Load testing completed successfully!\n');

  } catch (error) {
    console.error('❌ Load testing failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runLoadTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
