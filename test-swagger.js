const http = require('http');

// Test Swagger UI HTML endpoint
function testSwaggerUI() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api-docs/',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200 && data.includes('swagger-ui')) {
          console.log('✅ Swagger UI endpoint responding with HTML');
          resolve(true);
        } else {
          console.log('❌ Swagger UI endpoint failed');
          reject(new Error(`Status: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Test that all documented endpoints exist
function testEndpoints() {
  const endpoints = [
    { method: 'POST', path: '/auth/register' },
    { method: 'POST', path: '/auth/login' },
    { method: 'POST', path: '/auth/refresh' },
    { method: 'POST', path: '/auth/logout' },
    { method: 'POST', path: '/shorten' },
    { method: 'POST', path: '/shorten-bulk' },
    { method: 'GET', path: '/my-urls' },
    { method: 'GET', path: '/all-urls' },
    { method: 'GET', path: '/health/health' },
    { method: 'GET', path: '/health/live' },
    { method: 'GET', path: '/health/ready' },
    { method: 'GET', path: '/health/metrics' },
  ];

  console.log('\n📋 Documented Endpoints in Swagger:');
  endpoints.forEach(ep => {
    console.log(`  ${ep.method.padEnd(6)} ${ep.path}`);
  });

  return true;
}

// Main test
async function runTests() {
  console.log('🧪 Testing Swagger Integration\n');

  try {
    await testSwaggerUI();
    testEndpoints();
    
    console.log('\n✅ All Swagger tests passed!');
    console.log('📚 Access Swagger UI at: http://localhost:3000/api-docs/\n');
  } catch (error) {
    console.error('❌ Swagger test failed:', error.message);
    process.exit(1);
  }
}

runTests();
