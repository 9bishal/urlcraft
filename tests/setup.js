// Test setup and global configuration
// This file runs before each test suite

// Suppress console logs during tests
global.console.log = jest.fn();
global.console.error = jest.fn();
global.console.warn = jest.fn();

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-12345';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-12345';

// Timeout for database operations
jest.setTimeout(30000);
