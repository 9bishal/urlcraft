const express = require('express');
const { pool, isRedisConnected, getRedisClient } = require('./config');

const router = express.Router();

/**
 * @swagger
 * /health/health:
 *   get:
 *     summary: Full health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application and dependencies are healthy
 *       503:
 *         description: Application or dependencies are down
 */
router.get('/health', async (req, res) => {
  try {
    // Check database connection
    const dbCheck = await pool.query('SELECT NOW()');
    const dbHealthy = !!dbCheck.rows[0];

    // Check Redis connection
    let redisHealthy = false;
    if (isRedisConnected()) {
      try {
        const redisClient = getRedisClient();
        if (redisClient) {
          await redisClient.ping();
          redisHealthy = true;
        }
      } catch (error) {
        redisHealthy = false;
      }
    }

    const status = dbHealthy ? 'up' : 'down';
    const statusCode = dbHealthy ? 200 : 503;

    res.status(statusCode).json({
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies: {
        database: {
          status: dbHealthy ? 'connected' : 'disconnected',
          latency: `${Date.now() - dbCheck.ioStart}ms`,
        },
        redis: {
          status: redisHealthy ? 'connected' : 'disconnected',
        },
      },
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'down',
      timestamp: new Date().toISOString(),
      error: error.message,
      environment: process.env.NODE_ENV || 'development',
    });
  }
});

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness probe
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is running
 */
router.get('/live', (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness probe
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is ready to accept traffic
 *       503:
 *         description: Application is not ready
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if we can query the database
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'not-ready', error: error.message });
  }
});

/**
 * @swagger
 * /health/metrics:
 *   get:
 *     summary: Application metrics
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application metrics including uptime and URL counts
 */
router.get('/metrics', async (req, res) => {
  try {
    // Get URL count
    const urlCountResult = await pool.query('SELECT COUNT(*) FROM urls');
    const urlCount = parseInt(urlCountResult.rows[0].count, 10);

    // Get user count
    const userCountResult = await pool.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(userCountResult.rows[0].count, 10);

    res.status(200).json({
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      metrics: {
        total_urls: urlCount,
        total_users: userCount,
        uptime_seconds: Math.floor(process.uptime()),
      },
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
