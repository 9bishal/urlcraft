const express = require('express');
const { pool } = require('./config');
const {
  generateAccessToken,
  generateRefreshToken,
  hashPassword,
  comparePassword,
  storeRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  extractTokenFromHeader
} = require('./auth');

const router = express.Router();

// Validation helper
const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validatePassword = (password) => {
  return password.length >= 8;
};

const validateUsername = (username) => {
  return /^[a-zA-Z0-9_-]{3,30}$/.test(username);
};

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Username (3-30 chars, alphanumeric, dash, underscore)
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *                 description: At least 8 characters
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 *                 username: { type: string }
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
 */
// POST /auth/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, and password are required' });
    }

    if (!validateUsername(username)) {
      return res.status(400).json({ error: 'Username must be 3-30 characters, alphanumeric, dash, or underscore' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if username or email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert new user
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, email, passwordHash]
    );

    const user = result.rows[0];
    const userId = user.id;

    // Generate tokens
    const accessToken = generateAccessToken(userId, username);
    const refreshToken = generateRefreshToken(userId);

    // Store refresh token in database
    await storeRefreshToken(userId, refreshToken);

    res.status(201).json({
      message: 'User registered successfully',
      userId,
      username: user.username,
      email: user.email,
      accessToken,
      refreshToken,
      expiresIn: 900 // 15 minutes in seconds
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username: { type: string }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 *                 username: { type: string }
 *       400:
 *         description: Invalid credentials
 *       401:
 *         description: Unauthorized
 */
// POST /auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    // Find user by username
    const result = await pool.query(
      'SELECT id, username, password_hash FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.username);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token in database
    await storeRefreshToken(user.id, refreshToken);

    res.json({
      message: 'Login successful',
      userId: user.id,
      username: user.username,
      accessToken,
      refreshToken,
      expiresIn: 900 // 15 minutes in seconds
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Token refreshed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *       400:
 *         description: Invalid refresh token
 *       401:
 *         description: Unauthorized
 */
// POST /auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  try {
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken is required' });
    }

    // Verify refresh token
    const decoded = await verifyRefreshToken(refreshToken);

    // Get user info
    const result = await pool.query(
      'SELECT username FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(decoded.userId, result.rows[0].username);

    res.json({
      message: 'Access token refreshed',
      accessToken: newAccessToken,
      expiresIn: 900
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(401).json({ error: error.message });
  }
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     description: Logout and revoke the refresh token to invalidate all sessions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Optional refresh token to revoke
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Failed to logout
 */
// POST /auth/logout
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  const authHeader = req.headers.authorization;
  const accessToken = extractTokenFromHeader(authHeader);

  try {
    if (!refreshToken && !accessToken) {
      return res.status(400).json({ error: 'refreshToken or Authorization header is required' });
    }

    // Revoke refresh token
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

module.exports = router;
