const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { pool } = require('./config');

// Environment variables for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-characters-long-please';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10');

// Generate JWT Access Token
const generateAccessToken = (userId, username) => {
  return jwt.sign(
    { userId, username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

// Generate Refresh Token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
};

// Hash password
const hashPassword = async (password) => {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
};

// Compare password with hash
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

// Store refresh token in database
const storeRefreshToken = async (userId, refreshToken) => {
  const decoded = jwt.verify(refreshToken, JWT_SECRET);
  const expiresAt = new Date(decoded.exp * 1000);
  
  const result = await pool.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING id',
    [userId, refreshToken, expiresAt]
  );
  
  return result.rows[0];
};

// Verify refresh token is valid and not revoked
const verifyRefreshToken = async (refreshToken) => {
  try {
    // Verify JWT signature
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    
    // Check if token exists in database and not revoked
    const result = await pool.query(
      'SELECT id, user_id FROM refresh_tokens WHERE token = $1 AND revoked = false AND expires_at > NOW()',
      [refreshToken]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Refresh token not found or revoked');
    }
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid refresh token: ' + error.message);
  }
};

// Verify access token
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid access token: ' + error.message);
  }
};

// Revoke refresh token (for logout)
const revokeRefreshToken = async (refreshToken) => {
  await pool.query(
    'UPDATE refresh_tokens SET revoked = true WHERE token = $1',
    [refreshToken]
  );
};

// Get token from Authorization header
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  hashPassword,
  comparePassword,
  storeRefreshToken,
  verifyRefreshToken,
  verifyAccessToken,
  revokeRefreshToken,
  extractTokenFromHeader,
  JWT_SECRET,
  JWT_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
  BCRYPT_ROUNDS
};
