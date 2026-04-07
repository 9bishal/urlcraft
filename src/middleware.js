const rateLimit = require('express-rate-limit');

// In test mode, disable rate limiting entirely
const shortenRateLimiter = process.env.NODE_ENV === 'test'
  ? (req, res, next) => next() // No-op middleware in test mode
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 30, // 30 requests per window per IP
      message: 'Too many short URLs created from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });

module.exports = { shortenRateLimiter };
