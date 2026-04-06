const rateLimit = require('express-rate-limit');

const shortenRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 30,
  message: 'Too many short URLs created from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test', // Skip rate limiting in test mode
});

module.exports = { shortenRateLimiter };
