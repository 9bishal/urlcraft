const express = require('express');
const { config, isRedisConnected } = require('./config');
const { shortenRateLimiter } = require('./middleware');
const routes = require('./routes');
const authRoutes = require('./auth-routes');
const healthRoutes = require('./health-routes');
const { initializeAuthTables } = require('./init-auth-db');

const app = express();

// Enable CORS with configurable origin
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    config.cors.origin === '*' ? '*' : config.cors.origin,
  ].filter(Boolean);

  const origin = req.headers.origin;
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware
app.use(express.json());
app.use(express.static('frontend'));

// Rate limiting for specific endpoints
app.use('/shorten', shortenRateLimiter);

// Routes
app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
  });
});

// Initialize auth tables on startup
initializeAuthTables().catch(error => {
  console.error('Failed to initialize auth tables:', error);
  process.exit(1);
});

// Start server
const PORT = config.port;
const HOST = config.host;

app.listen(PORT, HOST, () => {
  console.log(`\n✅ URLCraft v0.9.0 running on http://${HOST}:${PORT}`);
  console.log(`📝 Features: JWT Auth, Refresh Tokens, Short URLs, Redis Caching, Rate Limiting, Health Checks`);
  console.log(`💾 Database: PostgreSQL | 🔐 Auth: JWT + Refresh Tokens | 🔴 Cache: ${isRedisConnected() ? '✅ Redis' : '⚠️ Disabled'}`);
  console.log(`📊 Health: http://${HOST}:${PORT}/health | Metrics: http://${HOST}:${PORT}/metrics`);
  console.log(`🌍 Environment: ${config.nodeEnv}\n`);
});
