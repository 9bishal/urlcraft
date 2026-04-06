// Test utilities and helpers
const jwt = require('jsonwebtoken');
const { pool } = require('../src/config');

/**
 * Generate a test JWT token
 */
function generateTestToken(userId, username) {
  return jwt.sign(
    { userId, username },
    process.env.JWT_SECRET || 'test-secret-key-12345',
    { expiresIn: '15m' }
  );
}

/**
 * Generate a test refresh token
 */
function generateTestRefreshToken(userId) {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.REFRESH_TOKEN_SECRET || 'test-refresh-secret-12345',
    { expiresIn: '7d' }
  );
}

/**
 * Clear all test data from database
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
 * Create a test user in database
 */
async function createTestUser(username = 'testuser', email = 'test@example.com', passwordHash = null) {
  try {
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, passwordHash || 'hashedpassword123']
    );
    return result.rows[0];
  } catch (err) {
    console.error('Error creating test user:', err);
    return null;
  }
}

/**
 * Get user by username
 */
async function getUserByUsername(username) {
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0] || null;
  } catch (err) {
    console.error('Error getting user:', err);
    return null;
  }
}

/**
 * Create a test short URL
 */
async function createTestUrl(userId, originalUrl = 'https://example.com', shortCode = 'test123') {
  try {
    const result = await pool.query(
      'INSERT INTO urls (user_id, original_url, short_code) VALUES ($1, $2, $3) RETURNING *',
      [userId, originalUrl, shortCode]
    );
    return result.rows[0];
  } catch (err) {
    console.error('Error creating test URL:', err);
    return null;
  }
}

module.exports = {
  generateTestToken,
  generateTestRefreshToken,
  clearDatabase,
  createTestUser,
  getUserByUsername,
  createTestUrl,
};
