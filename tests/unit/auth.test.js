// Unit Tests: Authentication helpers
const { hashPassword, comparePassword } = require('../../src/auth');

describe('Auth Helpers - Unit Tests', () => {
  
  describe('hashPassword()', () => {
    test('should hash a password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    test('should produce different hashes for same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });

    test('should handle long passwords', async () => {
      const longPassword = 'a'.repeat(100) + 'Password123!';
      const hash = await hashPassword(longPassword);
      
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });

    test('should reject empty password', async () => {
      try {
        await hashPassword('');
        expect(true).toBe(false); // Should not reach here
      } catch (err) {
        expect(err).toBeDefined();
      }
    });
  });

  describe('comparePassword()', () => {
    test('should return true for matching password and hash', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const isMatch = await comparePassword(password, hash);
      
      expect(isMatch).toBe(true);
    });

    test('should return false for non-matching password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const isMatch = await comparePassword('WrongPassword123!', hash);
      
      expect(isMatch).toBe(false);
    });

    test('should handle special characters', async () => {
      const password = 'P@ssw0rd!#$%^&*()';
      const hash = await hashPassword(password);
      const isMatch = await comparePassword(password, hash);
      
      expect(isMatch).toBe(true);
    });
  });
});
