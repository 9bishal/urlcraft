const express = require('express');
const { pool, redisClient, isRedisConnected } = require('./config');
const { isValidUrl, getOrGenerateCode, parseExpiration, isUrlExpired } = require('./helpers');
const { authenticateJWT, checkUrlOwnership } = require('./auth-middleware');

const router = express.Router();
const PORT = 3000;

// POST /shorten (Requires authentication)
router.post('/shorten', authenticateJWT, async (req, res) => {
  const { longUrl, customCode, expiresIn } = req.body;
  const userId = req.user.userId;

  if (!longUrl) return res.status(400).json({ error: 'longUrl is required' });
  if (!isValidUrl(longUrl)) return res.status(400).json({ error: 'Invalid URL format' });

  try {
    const { code, isCustom } = await getOrGenerateCode(customCode);
    const expiresAt = expiresIn ? parseExpiration(expiresIn) : null;

    await pool.query(
      'INSERT INTO urls (short_code, original_url, is_custom, expires_at, user_id) VALUES ($1, $2, $3, $4, $5)',
      [code, longUrl, isCustom, expiresAt, userId]
    );

    if (isRedisConnected()) {
      await redisClient.setEx(`url:${code}`, 24 * 60 * 60, longUrl);
    }

    res.status(201).json({
      shortCode: code,
      shortUrl: `http://localhost:${PORT}/${code}`,
      originalUrl: longUrl,
      isCustom,
      expiresAt: expiresAt || null
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error creating short URL:', error);
    res.status(500).json({ error: 'Failed to create short URL' });
  }
});

// POST /shorten-bulk (Requires authentication)
router.post('/shorten-bulk', authenticateJWT, async (req, res) => {
  const { urls } = req.body;
  const userId = req.user.userId;

  if (!Array.isArray(urls)) return res.status(400).json({ error: 'urls must be an array' });
  if (urls.length === 0) return res.status(400).json({ error: 'urls array cannot be empty' });
  if (urls.length > 100) return res.status(400).json({ error: 'Maximum 100 URLs per request' });

  const results = [];
  const errors = [];

  for (let i = 0; i < urls.length; i++) {
    const { longUrl, customCode, expiresIn } = urls[i];

    try {
      if (!longUrl) {
        errors.push({ index: i, error: 'longUrl is required' });
        continue;
      }
      if (!isValidUrl(longUrl)) {
        errors.push({ index: i, error: 'Invalid URL format' });
        continue;
      }

      const { code, isCustom } = await getOrGenerateCode(customCode);
      const expiresAt = expiresIn ? parseExpiration(expiresIn) : null;

      await pool.query(
        'INSERT INTO urls (short_code, original_url, is_custom, expires_at, user_id) VALUES ($1, $2, $3, $4, $5)',
        [code, longUrl, isCustom, expiresAt, userId]
      );

      if (isRedisConnected()) {
        await redisClient.setEx(`url:${code}`, 24 * 60 * 60, longUrl);
      }

      results.push({
        shortCode: code,
        shortUrl: `http://localhost:${PORT}/${code}`,
        originalUrl: longUrl,
        isCustom,
        expiresAt: expiresAt || null
      });
    } catch (error) {
      if (error.status) {
        errors.push({ index: i, error: error.message });
      } else {
        console.error('Error in bulk creation:', error);
        errors.push({ index: i, error: 'Failed to create short URL' });
      }
    }
  }

  res.status(201).json({
    created: results.length,
    failed: errors.length,
    results,
    errors: errors.length > 0 ? errors : undefined
  });
});

// GET /all-urls
router.get('/all-urls', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT short_code, original_url, clicks, created_at, is_custom, expires_at FROM urls ORDER BY created_at DESC'
    );

    const urls = result.rows.map(url => ({
      shortCode: url.short_code,
      shortUrl: `http://localhost:${PORT}/${url.short_code}`,
      originalUrl: url.original_url,
      clicks: url.clicks,
      isCustom: url.is_custom,
      createdAt: url.created_at,
      expiresAt: url.expires_at || null,
      isExpired: url.expires_at ? isUrlExpired(url.expires_at) : false
    }));

    res.json({
      total: urls.length,
      urls
    });
  } catch (error) {
    console.error('Error fetching all URLs:', error);
    res.status(500).json({ error: 'Failed to fetch URLs' });
  }
});

// GET /my-urls (Authenticated - List user's URLs)
router.get('/my-urls', authenticateJWT, async (req, res) => {
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      'SELECT short_code, original_url, clicks, created_at, is_custom, expires_at FROM urls WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    const urls = result.rows.map(url => ({
      shortCode: url.short_code,
      shortUrl: `http://localhost:${PORT}/${url.short_code}`,
      originalUrl: url.original_url,
      clicks: url.clicks,
      isCustom: url.is_custom,
      createdAt: url.created_at,
      expiresAt: url.expires_at || null,
      isExpired: url.expires_at ? isUrlExpired(url.expires_at) : false
    }));

    res.json({
      total: urls.length,
      urls
    });
  } catch (error) {
    console.error('Error fetching user URLs:', error);
    res.status(500).json({ error: 'Failed to fetch URLs' });
  }
});

// GET /:shortCode
router.get('/:shortCode', async (req, res) => {
  const { shortCode } = req.params;

  try {
    let originalUrl = null;

    if (isRedisConnected()) {
      originalUrl = await redisClient.get(`url:${shortCode}`);
    }

    if (!originalUrl) {
      const result = await pool.query('SELECT original_url, expires_at FROM urls WHERE short_code = $1', [shortCode]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Short URL not found' });
      
      if (isUrlExpired(result.rows[0].expires_at)) {
        return res.status(410).json({ error: 'This short URL has expired' });
      }
      
      originalUrl = result.rows[0].original_url;
      
      if (isRedisConnected()) {
        await redisClient.setEx(`url:${shortCode}`, 24 * 60 * 60, originalUrl);
      }
    }

    await pool.query('UPDATE urls SET clicks = clicks + 1 WHERE short_code = $1', [shortCode]);
    if (isRedisConnected()) {
      await redisClient.incr(`clicks:${shortCode}`);
    }

    res.redirect(301, originalUrl);
  } catch (error) {
    console.error('Error redirecting:', error);
    res.status(500).json({ error: 'Failed to redirect' });
  }
});

// GET /stats/:shortCode
router.get('/stats/:shortCode', async (req, res) => {
  const { shortCode } = req.params;

  try {
    const result = await pool.query(
      'SELECT short_code, original_url, clicks, created_at, is_custom, expires_at FROM urls WHERE short_code = $1',
      [shortCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    const url = result.rows[0];
    let clicks = url.clicks;

    if (isRedisConnected()) {
      const cachedClicks = await redisClient.get(`clicks:${shortCode}`);
      if (cachedClicks) clicks = url.clicks + parseInt(cachedClicks);
    }

    const response = {
      shortCode: url.short_code,
      shortUrl: `http://localhost:${PORT}/${url.short_code}`,
      originalUrl: url.original_url,
      clicks,
      isCustom: url.is_custom,
      createdAt: url.created_at
    };

    if (url.expires_at) {
      response.expiresAt = url.expires_at;
      response.isExpired = isUrlExpired(url.expires_at);
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// DELETE /shorten/:shortCode
router.delete('/shorten/:shortCode', authenticateJWT, async (req, res) => {
  const { shortCode } = req.params;
  const userId = req.user.userId;

  try {
    // Check if URL belongs to user and delete
    const result = await pool.query(
      'DELETE FROM urls WHERE short_code = $1 AND user_id = $2 RETURNING short_code',
      [shortCode, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Short URL not found or you do not have permission to delete it' });
    }

    if (isRedisConnected()) {
      await redisClient.del(`url:${shortCode}`);
      await redisClient.del(`clicks:${shortCode}`);
    }

    res.json({
      message: 'Short URL deleted successfully',
      deletedCode: result.rows[0].short_code
    });
  } catch (error) {
    console.error('Error deleting short URL:', error);
    res.status(500).json({ error: 'Failed to delete short URL' });
  }
});

// GET /
router.get('/', (req, res) => {
  res.json({
    message: '👋 Welcome to URLCraft - URL Shortener API with JWT Authentication',
    version: '0.8.0',
    phase: 'Phase 8: JWT + Refresh Tokens',
    authentication: {
      'POST /auth/register': 'Register new user',
      'POST /auth/login': 'Login and get tokens',
      'POST /auth/refresh': 'Get new access token using refresh token',
      'POST /auth/logout': 'Logout and revoke refresh token'
    },
    publicEndpoints: {
      'GET /:shortCode': 'Redirect to original URL (public)',
      'GET /': 'API info (public)'
    },
    protectedEndpoints: {
      'POST /shorten': 'Create short URL (requires JWT)',
      'POST /shorten-bulk': 'Create multiple short URLs (requires JWT)',
      'GET /my-urls': 'List your short URLs (requires JWT)',
      'GET /stats/:shortCode': 'Get URL analytics (requires JWT)',
      'DELETE /shorten/:shortCode': 'Delete your short URL (requires JWT)',
      'GET /all-urls': 'List all short URLs (requires JWT)'
    },
    expirationFormats: {
      '30m': 'Expires in 30 minutes',
      '24h': 'Expires in 24 hours',
      '7d': 'Expires in 7 days'
    },
    authFlow: {
      '1_Register': 'POST /auth/register with username, email, password',
      '2_GetTokens': 'Receive accessToken (15m) and refreshToken (7d)',
      '3_UseAccessToken': 'Include Authorization: Bearer <accessToken> in requests',
      '4_TokenExpired': 'Use POST /auth/refresh with refreshToken to get new accessToken',
      '5_Logout': 'POST /auth/logout to revoke refresh token'
    }
  });
});

module.exports = router;
