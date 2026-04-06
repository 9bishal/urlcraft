const { verifyAccessToken, extractTokenFromHeader } = require('./auth');

// Middleware to verify JWT token
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: error.message });
  }
};

// Middleware to check if user owns the URL
const checkUrlOwnership = async (pool, req, res, next) => {
  const { shortCode } = req.params;
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      'SELECT user_id FROM urls WHERE short_code = $1',
      [shortCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    if (result.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'You do not have permission to access this URL' });
    }

    next();
  } catch (error) {
    console.error('Error checking URL ownership:', error);
    res.status(500).json({ error: 'Failed to verify ownership' });
  }
};

module.exports = {
  authenticateJWT,
  checkUrlOwnership
};
