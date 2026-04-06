// Unit Tests: JWT Token Generation
const jwt = require('jsonwebtoken');
const { generateAccessToken, generateRefreshToken } = require('../../src/auth');

describe('JWT Token Generation - Unit Tests', () => {
  
  describe('generateAccessToken()', () => {
    test('should generate a valid access token', () => {
      const userId = 1;
      const username = 'testuser';
      const token = generateAccessToken(userId, username);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    test('should contain correct payload', () => {
      const userId = 1;
      const username = 'testuser';
      const token = generateAccessToken(userId, username);
      
      const decoded = jwt.decode(token);
      expect(decoded.userId).toBe(userId);
      expect(decoded.username).toBe(username);
    });

    test('should expire in 15 minutes', () => {
      const userId = 1;
      const username = 'testuser';
      const token = generateAccessToken(userId, username);
      
      const decoded = jwt.decode(token);
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = decoded.exp - now;
      
      // Should be approximately 15 minutes (900 seconds)
      expect(expiresIn).toBeGreaterThan(890);
      expect(expiresIn).toBeLessThanOrEqual(900);
    });

    test('should be verifiable with JWT_SECRET', () => {
      const userId = 1;
      const username = 'testuser';
      const token = generateAccessToken(userId, username);
      
      const secret = process.env.JWT_SECRET || 'test-secret-key-12345';
      expect(() => {
        jwt.verify(token, secret);
      }).not.toThrow();
    });
  });

  describe('generateRefreshToken()', () => {
    test('should generate a valid refresh token', () => {
      const userId = 1;
      const token = generateRefreshToken(userId);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    test('should contain correct payload', () => {
      const userId = 1;
      const token = generateRefreshToken(userId);
      
      const decoded = jwt.decode(token);
      expect(decoded.userId).toBe(userId);
      expect(decoded.type).toBe('refresh');
    });

    test('should expire in 7 days', () => {
      const userId = 1;
      const token = generateRefreshToken(userId);
      
      const decoded = jwt.decode(token);
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = decoded.exp - now;
      const sevenDaysInSeconds = 7 * 24 * 60 * 60;
      
      expect(expiresIn).toBeGreaterThan(sevenDaysInSeconds - 10);
      expect(expiresIn).toBeLessThanOrEqual(sevenDaysInSeconds);
    });

    test('should be verifiable with JWT_SECRET', () => {
      const userId = 1;
      const token = generateRefreshToken(userId);
      
      const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-characters-long-please';
      expect(() => {
        jwt.verify(token, secret);
      }).not.toThrow();
    });
  });

  describe('Token Verification', () => {
    test('access token and refresh token use same secret', () => {
      const userId = 1;
      const username = 'testuser';
      const accessToken = generateAccessToken(userId, username);
      const refreshToken = generateRefreshToken(userId);
      
      const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-characters-long-please';
      
      // Both should be verifiable with the same secret
      expect(() => {
        jwt.verify(accessToken, secret);
      }).not.toThrow();
      
      expect(() => {
        jwt.verify(refreshToken, secret);
      }).not.toThrow();
    });

    test('tokens are invalid with wrong secret', () => {
      const userId = 1;
      const username = 'testuser';
      const accessToken = generateAccessToken(userId, username);
      const wrongSecret = 'wrong-secret-key';
      
      expect(() => {
        jwt.verify(accessToken, wrongSecret);
      }).toThrow();
    });
  });
});
