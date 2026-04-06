// Integration Tests: URL Shortening Endpoints
const request = require('supertest');
const { pool } = require('../../src/config');

const API_URL = 'http://localhost:3000';

describe('URL Shortening API Integration Tests', () => {
  
  let userToken;
  let userId;
  let userName;

  beforeAll(async () => {
    // Wait for API to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Clear database
    try {
      await pool.query('DELETE FROM refresh_tokens');
      await pool.query('DELETE FROM urls');
      await pool.query('DELETE FROM users');
    } catch (err) {
      console.error('Setup error:', err);
    }

    // Register test user
    const res = await request(API_URL)
      .post('/auth/register')
      .set('Content-Type', 'application/json')
      .send({
        username: 'urltest',
        email: 'urltest@example.com',
        password: 'UrlPass123!'
      });

    userToken = res.body.accessToken;
    userId = res.body.userId;
    userName = res.body.username;
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

  describe('POST /shorten', () => {
    
    test('should create short URL with valid input', async () => {
      const res = await request(API_URL)
        .post('/shorten')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Content-Type', 'application/json')
        .send({
          longUrl: 'https://www.example.com/very/long/url'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('shortCode');
      expect(res.body).toHaveProperty('shortUrl');
      expect(res.body.originalUrl).toBe('https://www.example.com/very/long/url');
      expect(res.body.shortUrl).toContain(res.body.shortCode);
    });

    test('should create URL with custom code', async () => {
      const res = await request(API_URL)
        .post('/shorten')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Content-Type', 'application/json')
        .send({
          longUrl: 'https://www.github.com',
          customCode: 'mycode'
        });

      expect(res.status).toBe(201);
      expect(res.body.shortCode).toBe('mycode');
      expect(res.body.isCustom).toBe(true);
    });

    test('should reject duplicate custom code', async () => {
      // Create first URL with custom code
      await request(API_URL)
        .post('/shorten')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Content-Type', 'application/json')
        .send({
          longUrl: 'https://www.example.com',
          customCode: 'uniquecode'
        });

      // Try to create another with same code
      const res = await request(API_URL)
        .post('/shorten')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Content-Type', 'application/json')
        .send({
          longUrl: 'https://www.different.com',
          customCode: 'uniquecode'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already taken');
    });

    test('should reject invalid URL', async () => {
      const res = await request(API_URL)
        .post('/shorten')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Content-Type', 'application/json')
        .send({
          longUrl: 'not-a-valid-url'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('should reject request without auth token', async () => {
      const res = await request(API_URL)
        .post('/shorten')
        .set('Content-Type', 'application/json')
        .send({
          longUrl: 'https://www.example.com'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    test('should reject request with invalid token', async () => {
      const res = await request(API_URL)
        .post('/shorten')
        .set('Authorization', 'Bearer invalid-token-xyz')
        .set('Content-Type', 'application/json')
        .send({
          longUrl: 'https://www.example.com'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    test('should reject missing longUrl field', async () => {
      const res = await request(API_URL)
        .post('/shorten')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Content-Type', 'application/json')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('GET /my-urls', () => {
    
    beforeAll(async () => {
      // Create a few test URLs
      await request(API_URL)
        .post('/shorten')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Content-Type', 'application/json')
        .send({
          longUrl: 'https://www.test1.com'
        });

      await request(API_URL)
        .post('/shorten')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Content-Type', 'application/json')
        .send({
          longUrl: 'https://www.test2.com'
        });
    });

    test('should list user URLs', async () => {
      const res = await request(API_URL)
        .get('/my-urls')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.urls)).toBe(true);
      expect(res.body.urls.length).toBeGreaterThanOrEqual(2);
    });

    test('should include correct URL properties', async () => {
      const res = await request(API_URL)
        .get('/my-urls')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      const url = res.body.urls[0];
      expect(url).toHaveProperty('shortCode');
      expect(url).toHaveProperty('originalUrl');
      expect(url).toHaveProperty('shortUrl');
      expect(url).toHaveProperty('clicks');
      expect(url).toHaveProperty('createdAt');
    });

    test('should reject request without auth token', async () => {
      const res = await request(API_URL)
        .get('/my-urls');

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    test('should reject with invalid token', async () => {
      const res = await request(API_URL)
        .get('/my-urls')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('DELETE /shorten/:code', () => {
    let testShortCode;

    beforeAll(async () => {
      // Create a URL to delete
      const res = await request(API_URL)
        .post('/shorten')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Content-Type', 'application/json')
        .send({
          longUrl: 'https://www.todelete.com'
        });

      testShortCode = res.body.shortCode;
    });

    test('should delete URL successfully', async () => {
      const res = await request(API_URL)
        .delete(`/shorten/${testShortCode}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted');
    });

    test('should return 404 for non-existent URL', async () => {
      const res = await request(API_URL)
        .delete('/shorten/nonexistent123')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });

    test('should reject delete without auth', async () => {
      // Create another URL
      const createRes = await request(API_URL)
        .post('/shorten')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Content-Type', 'application/json')
        .send({
          longUrl: 'https://www.protected.com'
        });

      // Try to delete without auth
      const deleteRes = await request(API_URL)
        .delete(`/shorten/${createRes.body.shortCode}`);

      expect(deleteRes.status).toBe(401);
      expect(deleteRes.body.error).toBeDefined();
    });
  });

  describe('GET /:shortCode (Redirect)', () => {
    let testShortCode;

    beforeAll(async () => {
      // Create a URL to redirect
      const res = await request(API_URL)
        .post('/shorten')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Content-Type', 'application/json')
        .send({
          longUrl: 'https://www.example.com/redirect-test'
        });

      testShortCode = res.body.shortCode;
    });

    test('should redirect to original URL', async () => {
      const res = await request(API_URL)
        .get(`/${testShortCode}`)
        .redirects(0); // Don't follow redirects

      expect(res.status).toBe(301);
      expect(res.headers.location).toBe('https://www.example.com/redirect-test');
    });

    test('should increment click count', async () => {
      // Visit the short URL
      await request(API_URL)
        .get(`/${testShortCode}`)
        .redirects(0);

      // Check stats
      const statsRes = await request(API_URL)
        .get(`/stats/${testShortCode}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(statsRes.status).toBe(200);
      expect(statsRes.body.clicks).toBeGreaterThan(0);
    });

    test('should return 404 for non-existent short code', async () => {
      const res = await request(API_URL)
        .get('/nonexistent123');

      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });
  });
});
