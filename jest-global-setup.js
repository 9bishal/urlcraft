// Global test setup - starts the app before running tests
// Sets NODE_ENV=test so rate limiting is disabled

process.env.NODE_ENV = 'test';

module.exports = async () => {
  // Wait a bit for any previous process to cleanup
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Start the app server on port 3000
  const app = require('../src/index.js');
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));
};
