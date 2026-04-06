require('dotenv').config();
const { Pool } = require('pg');
const redis = require('redis');

// Configuration from environment variables
const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  
  // Database
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'urlcraft_db',
    user: process.env.DB_USER || 'bishalkumarshah',
    password: process.env.DB_PASSWORD || '',
  },
  
  // Redis
  redis: {
    url: process.env.REDIS_URL || undefined,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  
  // Frontend
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
};

// PostgreSQL connection pool
const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('⚠️ PostgreSQL pool error:', err.message);
});

// Redis connection
let redisClient = null;
let isRedisConnected = false;

async function initializeRedis() {
  try {
    redisClient = redis.createClient(config.redis.url ? { url: config.redis.url } : {
      host: config.redis.host,
      port: config.redis.port,
    });

    redisClient.on('error', (err) => {
      console.warn('⚠️ Redis connection error:', err.message);
      isRedisConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
      isRedisConnected = true;
    });

    await redisClient.connect();
    isRedisConnected = true;
  } catch (err) {
    console.warn('⚠️ Redis not available, caching disabled:', err.message);
    isRedisConnected = false;
  }
}

// Initialize Redis on startup
initializeRedis();

module.exports = {
  config,
  pool,
  redisClient,
  isRedisConnected: () => isRedisConnected,
  getRedisClient: () => redisClient,
};
