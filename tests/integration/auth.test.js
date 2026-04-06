// Integration Tests: Authentication Endpoints
const request = require('supertest');
const { pool } = require('../../src/config');
const { hashPassword } = require('../../src/auth');

const API_URL = 'http://localhost:3000';

describe('Auth API Integration Tests', () => {
  
  beforeAll(async () => {
    // Wait for API to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Clear database before tests
    try {
      await pool.query('DELETE FROM refresh_tokens');
      await pool.query('DELETE FROM urls');
      await pool.query('DELETE FROM users');
    } catch (err) {
      console.error('Setup error:', err);
    }
  });

  afterAll(async () => {
    // Clean up - but don't close pool
    try {
      await pool.query('DELETE FROM refresh_tokens');
      await pool.query('DELETE FROM urls');
      await pool.query('DELETE FROM users');
    } catch (err) {
      console.error('Cleanup error:', err);
    }
    // Don't close pool - let Jest handle it
  });

  describe('POST /auth/register', () => {
    
    test('should register a new user successfully', async () => {
      const res = await request(API_URL)
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send({
          username: 'alice',
          email: 'alice@example.com',
          password: 'SecurePass123!'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.username).toBe('alice');
      expect(res.body.email).toBe('alice@example.com');
    });

    test('should reject duplicate username', async () => {
      // First registration
      await request(API_URL)
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send({
          username: 'bob',
          email: 'bob@example.com',
          password: 'SecurePass123!'
        });

      // Try duplicate username
      const res = await request(API_URL)
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send({
          username: 'bob',
          email: 'bob2@example.com',
          password: 'SecurePass123!'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already exists');
    });

    test('should reject invalid email', async () => {
      const res = await request(API_URL)
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send({
          username: 'charlie',
          email: 'invalid-email',
          password: 'SecurePass123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('email');
    });

    test('should reject weak password (less than 8 chars)', async () => {
      const res = await request(API_URL)
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send({
          username: 'dave',
          email: 'dave@example.com',
          password: 'Pass123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Password');
    });

    test('should reject invalid username format', async () => {
      const res = await request(API_URL)
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send({
          username: 'ab', // too short
          email: 'eve@example.com',
          password: 'SecurePass123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Username');
    });

    test('should reject missing fields', async () => {
      const res = await request(API_URL)
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send({
          username: 'frank'
          // missing email and password
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('POST /auth/login', () => {
    
    beforeEach(async () => {
      // Create a test user
      await request(API_URL)
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send({
          username: 'logintest',
          email: 'logintest@example.com',
          password: 'LoginPass123!'
        });
    });

    test('should login with correct credentials', async () => {
      const res = await request(API_URL)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send({
          username: 'logintest',
          password: 'LoginPass123!'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.username).toBe('logintest');
    });

    test('should reject login with wrong password', async () => {
      const res = await request(API_URL)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send({
          username: 'logintest',
          password: 'WrongPassword123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid');
    });

    test('should reject login with non-existent user', async () => {
      const res = await request(API_URL)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send({
          username: 'nonexistent',
          password: 'AnyPassword123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid');
    });

    test('should reject login with missing fields', async () => {
      const res = await request(API_URL)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send({
          username: 'logintest'
          // missing password
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('POST /auth/refresh', () => {
    let testRefreshToken;

    beforeAll(async () => {
      // Register and get tokens
      const res = await request(API_URL)
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send({
          username: 'refreshtest',
          email: 'refreshtest@example.com',
          password: 'RefreshPass123!'
        });

      testRefreshToken = res.body.refreshToken;
    });

    test('should refresh token with valid refresh token', async () => {
      const res = await request(API_URL)
        .post('/auth/refresh')
        .set('Content-Type', 'application/json')
        .send({
          refreshToken: testRefreshToken
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.accessToken).not.toBe(null);
    });

    test('should reject invalid refresh token', async () => {
      const res = await request(API_URL)
        .post('/auth/refresh')
        .set('Content-Type', 'application/json')
        .send({
          refreshToken: 'invalid-token-xyz'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    test('should reject missing refresh token', async () => {
      const res = await request(API_URL)
        .post('/auth/refresh')
        .set('Content-Type', 'application/json')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('POST /auth/logout', () => {
    let testAccessToken;
    let testRefreshToken;

    beforeAll(async () => {
      const res = await request(API_URL)
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send({
          username: 'logouttest',
          email: 'logouttest@example.com',
          password: 'LogoutPass123!'
        });

      testAccessToken = res.body.accessToken;
      testRefreshToken = res.body.refreshToken;
    });

    test('should logout successfully', async () => {
      const res = await request(API_URL)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .set('Content-Type', 'application/json')
        .send({
          refreshToken: testRefreshToken
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('success');
    });

    test('should reject logout without token', async () => {
      const res = await request(API_URL)
        .post('/auth/logout')
        .set('Content-Type', 'application/json')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });
});
