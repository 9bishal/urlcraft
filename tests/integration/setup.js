// Integration test setup
// Starts the server and provides utilities for API testing

const request = require('supertest');
const { pool } = require('../../src/config');

let server;
const API_BASE = 'http://localhost:3000';

/**
 * Start the test server
 */
async function startServer() {
  if (server) return server;
  
  // Create a minimal Express app for testing
  const express = require('express');
  const app = express();
  
  // Add middleware
  app.use(express.json());
  
  // CORS
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });
  
  // Add routes
  const authRoutes = require('../../src/auth-routes');
  const routes = require('../../src/routes');
  
  app.use('/auth', authRoutes);
  app.use('/', routes);
  
  return new Promise((resolve) => {
    server = app.listen(3001, () => {
      console.log('Test server started on port 3001');
      resolve(server);
    });
  });
}

/**
 * Stop the test server
 */
async function stopServer() {
  if (server) {
    return new Promise((resolve) => {
      server.close(resolve);
    });
  }
}

/**
 * Clear database for clean tests
 */
async function clearDatabase() {
  try {
    await pool.query('DELETE FROM refresh_tokens');
    await pool.query('DELETE FROM urls');
    await pool.query('DELETE FROM users');
  } catch (err) {
    console.error('Error clearing database:', err);
  }
}

/**
 * Create test user directly in database
 */
async function createTestUser(username, email, passwordHash) {
  try {
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, passwordHash]
    );
    return result.rows[0];
  } catch (err) {
    console.error('Error creating test user:', err);
    return null;
  }
}

/**
 * Get request helper
 */
function getRequest() {
  return request('http://localhost:3001');
}

module.exports = {
  startServer,
  stopServer,
  clearDatabase,
  createTestUser,
  getRequest,
};
