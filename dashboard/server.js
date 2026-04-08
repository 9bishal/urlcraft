const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3001;
const HOST = process.env.DASHBOARD_HOST || '0.0.0.0';
const URLCRAFT_API = process.env.URLCRAFT_API_URL || 'http://localhost:3000';

// In-memory storage for logs and stats
let logs = [];
let stats = {
  totalRequests: 0,
  totalURLsCreated: 0,
  totalClicks: 0,
  totalUsers: 0,
  uptime: Date.now(),
};

// Middleware
app.use(express.json());
app.use(express.static('public'));

// ============= ADMIN API ENDPOINTS =============

/**
 * GET /api/stats
 * Returns application statistics
 */
app.get('/api/stats', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - stats.uptime) / 1000);
  res.json({
    ...stats,
    uptime: uptimeSeconds,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/logs
 * Returns application logs (paginated)
 * Query: ?limit=50&offset=0
 */
app.get('/api/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  
  const paginatedLogs = logs.slice(offset, offset + limit);
  
  res.json({
    total: logs.length,
    limit,
    offset,
    logs: paginatedLogs,
  });
});

/**
 * POST /api/logs/clear
 * Clears all logs
 */
app.post('/api/logs/clear', (req, res) => {
  logs = [];
  res.json({ message: 'Logs cleared', timestamp: new Date().toISOString() });
});

/**
 * GET /api/health
 * Health check of URLCraft API
 */
app.get('/api/health', async (req, res) => {
  try {
    const response = await axios.get(`${URLCRAFT_API}/health/health`, {
      timeout: 5000,
    });
    res.json({
      status: 'healthy',
      apiStatus: response.data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logEvent('ERROR', `URLCraft API health check failed: ${error.message}`);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/metrics
 * Returns URLCraft application metrics
 */
app.get('/api/metrics', async (req, res) => {
  try {
    const response = await axios.get(`${URLCRAFT_API}/health/metrics`, {
      timeout: 5000,
    });
    res.json(response.data);
  } catch (error) {
    logEvent('ERROR', `Failed to fetch metrics: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/track/request
 * Track a request (called from URLCraft API)
 * Body: { method, endpoint, statusCode, responseTime }
 */
app.post('/api/track/request', (req, res) => {
  const { method, endpoint, statusCode, responseTime } = req.body;
  
  stats.totalRequests++;
  logEvent('REQUEST', `${method} ${endpoint} - ${statusCode} (${responseTime}ms)`);
  
  res.json({ tracked: true });
});

/**
 * POST /api/track/url-created
 * Track URL creation
 * Body: { userId, shortCode, originalUrl }
 */
app.post('/api/track/url-created', (req, res) => {
  stats.totalURLsCreated++;
  const { userId, shortCode, originalUrl } = req.body;
  
  logEvent('URL_CREATED', `User ${userId} created ${shortCode} for ${originalUrl}`);
  
  res.json({ tracked: true });
});

/**
 * POST /api/track/url-clicked
 * Track URL click/redirect
 * Body: { shortCode, clickCount }
 */
app.post('/api/track/url-clicked', (req, res) => {
  stats.totalClicks++;
  const { shortCode, clickCount } = req.body;
  
  logEvent('URL_CLICKED', `Short URL ${shortCode} clicked (total: ${clickCount})`);
  
  res.json({ tracked: true });
});

/**
 * POST /api/track/user-registered
 * Track user registration
 * Body: { userId, username, email }
 */
app.post('/api/track/user-registered', (req, res) => {
  stats.totalUsers++;
  const { userId, username, email } = req.body;
  
  logEvent('USER_REGISTERED', `New user: ${username} (${email})`);
  
  res.json({ tracked: true });
});

/**
 * GET /api/dashboard
 * Returns dashboard overview with all stats and recent logs
 */
app.get('/api/dashboard', async (req, res) => {
  try {
    const health = await axios.get(`${URLCRAFT_API}/health/health`, {
      timeout: 5000,
    }).catch(() => ({ data: { status: 'offline' } }));

    const uptimeSeconds = Math.floor((Date.now() - stats.uptime) / 1000);
    
    res.json({
      overview: {
        ...stats,
        uptime: uptimeSeconds,
        apiStatus: health.data.status || 'offline',
      },
      recentLogs: logs.slice(-20),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= INTERNAL HELPER FUNCTIONS =============

/**
 * Log an event
 * @param {string} level - Event level (INFO, ERROR, REQUEST, etc.)
 * @param {string} message - Event message
 */
function logEvent(level, message) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    id: logs.length + 1,
  };
  
  logs.push(logEntry);
  
  // Keep only last 10000 logs in memory
  if (logs.length > 10000) {
    logs = logs.slice(-10000);
  }
  
  console.log(`[${level}] ${message}`);
}

// ============= PAGE ROUTES =============

/**
 * Serve dashboard HTML
 */
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// ============= ERROR HANDLERS =============

app.use((err, req, res, next) => {
  console.error('Error:', err);
  logEvent('ERROR', `${err.message}`);
  res.status(500).json({ error: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ============= START SERVER =============

const server = app.listen(PORT, HOST, () => {
  console.log(`\n📊 URLCraft Dashboard running on http://${HOST}:${PORT}`);
  console.log(`🔌 Connecting to URLCraft API at ${URLCRAFT_API}`);
  console.log(`📝 Dashboard API: http://${HOST}:${PORT}/api/`);
  console.log(`🌐 Admin Interface: http://${HOST}:${PORT}\n`);
  
  logEvent('START', 'Dashboard server started');
});

module.exports = { app, server, logEvent };
