const { pool } = require('./config');

function generateShortCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

function isValidCustomCode(code) {
  return /^[a-zA-Z0-9_-]{3,30}$/.test(code);
}

async function codeExists(code) {
  const result = await pool.query('SELECT id FROM urls WHERE short_code = $1', [code]);
  return result.rows.length > 0;
}

async function getOrGenerateCode(customCode) {
  if (customCode) {
    if (!isValidCustomCode(customCode)) {
      throw { status: 400, message: 'Invalid code format (3-30 chars, alphanumeric, dash, underscore)' };
    }
    if (await codeExists(customCode)) {
      throw { status: 409, message: 'This code is already taken' };
    }
    return { code: customCode, isCustom: true };
  }

  let code;
  let attempts = 0;
  do {
    code = generateShortCode();
    attempts++;
  } while (await codeExists(code) && attempts < 10);

  if (attempts >= 10) {
    throw { status: 500, message: 'Failed to generate unique code' };
  }
  return { code, isCustom: false };
}

function parseExpiration(expiresIn) {
  if (!expiresIn) return null;
  
  // Handle integer input (assumes hours)
  if (typeof expiresIn === 'number' || /^\d+$/.test(expiresIn)) {
    const hours = parseInt(expiresIn, 10);
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    return expiresAt;
  }
  
  // Handle string format (e.g., 24h, 7d, 30m)
  const match = expiresIn.match(/^(\d+)([hdm])$/);
  if (!match) throw { status: 400, message: 'Invalid expiration format (e.g., "2" for 2 hours, "24h", "7d", "30m")' };
  
  const [, amount, unit] = match;
  const ms = {
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  }[unit];
  
  const expiresAt = new Date(Date.now() + parseInt(amount) * ms);
  return expiresAt;
}

function isUrlExpired(expiresAt) {
  if (!expiresAt) return false;
  return new Date() > new Date(expiresAt);
}

module.exports = {
  generateShortCode,
  isValidUrl,
  isValidCustomCode,
  codeExists,
  getOrGenerateCode,
  parseExpiration,
  isUrlExpired
};
