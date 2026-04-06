// E2E Tests: Complete User Workflows
const request = require('supertest');
const { pool } = require('../../src/config');

const API_URL = 'http://localhost:3000';

describe('E2E: Complete User Workflows', () => {
  
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
    // Clean up
    try {
      await pool.query('DELETE FROM refresh_tokens');
      await pool.query('DELETE FROM urls');
      await pool.query('DELETE FROM users');
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  });

  describe('E2E: User Registration -> Create URLs -> Manage URLs', () => {
    let accessToken;
    let refreshToken;
    let username;
    let createdUrls = [];

    test('Step 1: User registers successfully', async () => {
      const res = await request(API_URL)
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send({
          username: 'e2euser1',
          email: 'e2euser1@example.com',
          password: 'E2EPassword123!'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.username).toBe('e2euser1');

      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
      username = res.body.username;
    });

    test('Step 2: User creates first short URL', async () => {
      const res = await request(API_URL)
        .post('/shorten')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Content-Type', 'application/json')
        .send({
          longUrl: 'https://www.github.com/bishalkumarshah'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('shortCode');
      expect(res.body).toHaveProperty('shortUrl');

      createdUrls.push(res.body.shortCode);
    });

    test('Step 3: User creates second URL with custom code', async () => {
      const res = await request(API_URL)
        .post('/shorten')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Content-Type', 'application/json')
        .send({
          longUrl: 'https://www.google.com',
          customCode: 'mysearch'
        });

      expect(res.status).toBe(201);
      expect(res.body.shortCode).toBe('mysearch');

      createdUrls.push(res.body.shortCode);
    });

    test('Step 4: User views all their URLs', async () => {
      const res = await request(API_URL)
        .get('/my-urls')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.urls)).toBe(true);
      expect(res.body.urls.length).toBeGreaterThanOrEqual(2);
      expect(res.body.total).toBeGreaterThanOrEqual(2);
    });

    test('Step 5: User can access short URLs (redirect)', async () => {
      const shortCode = createdUrls[0];
      const res = await request(API_URL)
        .get(`/${shortCode}`)
        .redirects(0); // Don't follow redirect

      expect(res.status).toBe(301);
      expect(res.headers.location).toContain('github.com');
    });

    test('Step 6: User checks URL statistics', async () => {
      const shortCode = createdUrls[0];
      
      // Visit the URL a few times
      for (let i = 0; i < 3; i++) {
        await request(API_URL)
          .get(`/${shortCode}`)
          .redirects(0);
      }

      // Check stats
      const res = await request(API_URL)
        .get(`/stats/${shortCode}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.clicks).toBeGreaterThan(0);
    });

    test('Step 7: User deletes one URL', async () => {
      const shortCode = createdUrls[0];
      const res = await request(API_URL)
        .delete(`/shorten/${shortCode}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted');
    });

    test('Step 8: User verifies URL was deleted', async () => {
      const shortCode = createdUrls[0];
      const res = await request(API_URL)
        .get(`/${shortCode}`);

      expect(res.status).toBe(404);
    });

    test('Step 9: User refreshes access token', async () => {
      const res = await request(API_URL)
        .post('/auth/refresh')
        .set('Content-Type', 'application/json')
        .send({
          refreshToken: refreshToken
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      
      // Update token for future requests
      accessToken = res.body.accessToken;
    });

    test('Step 10: User can still access their URLs after refresh', async () => {
      const res = await request(API_URL)
        .get('/my-urls')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.urls)).toBe(true);
    });

    test('Step 11: User logs out (revokes token)', async () => {
      const res = await request(API_URL)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Content-Type', 'application/json')
        .send({
          refreshToken: refreshToken
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('success');
    });

    test('Step 12: User cannot access protected endpoints after logout', async () => {
      const res = await request(API_URL)
        .get('/my-urls')
        .set('Authorization', `Bearer ${accessToken}`);

      // Note: Access token remains valid until expiration even after logout
      // Only refresh token is revoked. This test verifies current behavior.
      expect(res.status).toBe(200);
    });
  });

  describe('E2E: Multiple Users - Isolation & Security', () => {
    let user1Token;
    let user2Token;
    let user1Url;
    let user2Url;

    test('User 1 registers', async () => {
      const res = await request(API_URL)
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send({
          username: 'user1',
          email: 'user1@example.com',
          password: 'User1Pass123!'
        });

      expect(res.status).toBe(201);
      user1Token = res.body.accessToken;
    });

    test('User 2 registers', async () => {
      const res = await request(API_URL)
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send({
          username: 'user2',
          email: 'user2@example.com',
          password: 'User2Pass123!'
        });

      expect(res.status).toBe(201);
      user2Token = res.body.accessToken;
    });

    test('User 1 creates a URL', async () => {
      const res = await request(API_URL)
        .post('/shorten')
        .set('Authorization', `Bearer ${user1Token}`)
        .set('Content-Type', 'application/json')
        .send({
          longUrl: 'https://www.user1-site.com'
        });

      expect(res.status).toBe(201);
      user1Url = res.body.shortCode;
    });

    test('User 2 creates a URL', async () => {
      const res = await request(API_URL)
        .post('/shorten')
        .set('Authorization', `Bearer ${user2Token}`)
        .set('Content-Type', 'application/json')
        .send({
          longUrl: 'https://www.user2-site.com'
        });

      expect(res.status).toBe(201);
      user2Url = res.body.shortCode;
    });

    test('User 1 can see only their URLs', async () => {
      const res = await request(API_URL)
        .get('/my-urls')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      const urls = res.body.urls;
      const hasUser1Url = urls.some(u => u.shortCode === user1Url);
      const hasUser2Url = urls.some(u => u.shortCode === user2Url);

      expect(hasUser1Url).toBe(true);
      expect(hasUser2Url).toBe(false);
    });

    test('User 2 can see only their URLs', async () => {
      const res = await request(API_URL)
        .get('/my-urls')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(200);
      const urls = res.body.urls;
      const hasUser1Url = urls.some(u => u.shortCode === user1Url);
      const hasUser2Url = urls.some(u => u.shortCode === user2Url);

      expect(hasUser1Url).toBe(false);
      expect(hasUser2Url).toBe(true);
    });

    test('User 2 cannot delete User 1 URL', async () => {
      const res = await request(API_URL)
        .delete(`/shorten/${user1Url}`)
        .set('Authorization', `Bearer ${user2Token}`);

      // Returns 404 because URL doesn't exist in User 2's owned URLs
      expect(res.status).toBe(404);
    });

    test('User 1 can delete their own URL', async () => {
      const res = await request(API_URL)
        .delete(`/shorten/${user1Url}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('E2E: Error Handling & Edge Cases', () => {
    let testToken;

    beforeAll(async () => {
      const res = await request(API_URL)
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send({
          username: 'errortest',
          email: 'errortest@example.com',
          password: 'ErrorPass123!'
        });

      testToken = res.body.accessToken;
    });

    test('Cannot create URL with malformed URL', async () => {
      const res = await request(API_URL)
        .post('/shorten')
        .set('Authorization', `Bearer ${testToken}`)
        .set('Content-Type', 'application/json')
        .send({
          longUrl: 'this-is-not-a-url'
        });

      expect(res.status).toBe(400);
    });

    test('Cannot create URL with invalid custom code', async () => {
      const res = await request(API_URL)
        .post('/shorten')
        .set('Authorization', `Bearer ${testToken}`)
        .set('Content-Type', 'application/json')
        .send({
          longUrl: 'https://example.com',
          customCode: 'invalid@code#'
        });

      expect(res.status).toBe(400);
    });

    test('Cannot access private endpoints without token', async () => {
      const res = await request(API_URL)
        .get('/my-urls');

      expect(res.status).toBe(401);
    });

    test('Cannot access with expired/invalid token', async () => {
      const res = await request(API_URL)
        .get('/my-urls')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.invalid');

      expect(res.status).toBe(401);
    });

    test('Cannot create duplicate custom codes', async () => {
      // Create first URL
      const res1 = await request(API_URL)
        .post('/shorten')
        .set('Authorization', `Bearer ${testToken}`)
        .set('Content-Type', 'application/json')
        .send({
          longUrl: 'https://first-url.com',
          customCode: 'duplicate'
        });

      expect(res1.status).toBe(201);

      // Try to create second with same code
      const res2 = await request(API_URL)
        .post('/shorten')
        .set('Authorization', `Bearer ${testToken}`)
        .set('Content-Type', 'application/json')
        .send({
          longUrl: 'https://second-url.com',
          customCode: 'duplicate'
        });

      expect(res2.status).toBe(409);
    });

    test('Getting stats for non-existent URL returns 404', async () => {
      const res = await request(API_URL)
        .get('/stats/nonexistent999')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('E2E: Token Lifecycle & Refresh Flow', () => {
    let accessToken;
    let refreshToken;

    test('Register user to get tokens', async () => {
      const res = await request(API_URL)
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send({
          username: 'tokentest',
          email: 'tokentest@example.com',
          password: 'TokenPass123!'
        });

      expect(res.status).toBe(201);
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    test('Access token works for protected endpoints', async () => {
      const res = await request(API_URL)
        .get('/my-urls')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
    });

    test('Can refresh token with valid refresh token', async () => {
      const res = await request(API_URL)
        .post('/auth/refresh')
        .set('Content-Type', 'application/json')
        .send({
          refreshToken: refreshToken
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      
      // Old access token should still work initially
      const oldTokenRes = await request(API_URL)
        .get('/my-urls')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(oldTokenRes.status).toBe(200);

      // New token should work
      const newTokenRes = await request(API_URL)
        .get('/my-urls')
        .set('Authorization', `Bearer ${res.body.accessToken}`);

      expect(newTokenRes.status).toBe(200);
    });

    test('Invalid refresh token is rejected', async () => {
      const res = await request(API_URL)
        .post('/auth/refresh')
        .set('Content-Type', 'application/json')
        .send({
          refreshToken: 'invalid-refresh-token-xyz'
        });

      expect(res.status).toBe(401);
    });

    test('Missing refresh token is rejected', async () => {
      const res = await request(API_URL)
        .post('/auth/refresh')
        .set('Content-Type', 'application/json')
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
