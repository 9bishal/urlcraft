# Phase 8: JWT + Refresh Tokens Authentication

## Overview
This document explains the JWT + Refresh Token authentication system implemented in URLCraft v0.8.0.

---

## What is JWT + Refresh Tokens?

### JWT (JSON Web Token)
A **JWT** is a compact, self-contained token that contains user information and is cryptographically signed.

**Structure:** `header.payload.signature`

**Example:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

**Advantages:**
- ✅ Stateless (no server-side session storage needed)
- ✅ Self-contained (user info encoded in token)
- ✅ Works across distributed systems
- ✅ Secure (cryptographically signed)

### Refresh Tokens
A **Refresh Token** is a long-lived token used to obtain new JWTs when they expire.

**Why needed?**
- JWTs have short expiration (e.g., 15 minutes) for security
- Refresh tokens are long-lived (e.g., 7 days)
- Users don't need to re-login frequently
- If JWT is compromised, damage is limited

---

## How It Works in URLCraft

### 1. **User Registration**
```bash
POST /auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Flow:**
1. Validate input (username, email, password strength)
2. Hash password using **bcrypt** (with salt)
3. Create new user in `users` table
4. Generate JWT and Refresh Token
5. Store Refresh Token in `refresh_tokens` table
6. Return tokens to client

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "userId": 1
}
```

### 2. **User Login**
```bash
POST /auth/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "SecurePass123!"
}
```

**Flow:**
1. Find user by username
2. Compare provided password with stored bcrypt hash
3. If match, generate new JWT and Refresh Token
4. Return tokens

### 3. **Using Access Token**
```bash
GET /shorten
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Flow:**
1. Extract token from `Authorization: Bearer <token>` header
2. Verify JWT signature using secret key
3. If valid, user info is decoded and request proceeds
4. If expired/invalid, return 401 Unauthorized

### 4. **Refreshing Access Token**
```bash
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Flow:**
1. Verify Refresh Token signature
2. Check if token exists in `refresh_tokens` table
3. Check if token is revoked or expired
4. Generate new JWT
5. Return new access token

---

## Token Lifecycle

```
[User Registration/Login]
        ↓
[JWT (15 min) + Refresh Token (7 days)]
        ↓
[User makes API request with JWT]
        ↓
   ┌─────────────────────────────┐
   │ Is JWT valid & not expired? │
   └──────────┬──────────────────┘
              │
         ┌────┴────┐
         │          │
        YES        NO
         │          │
      [✓ OK]    [JWT Expired?]
                    │
                  YES
                    │
              [Use Refresh Token] 
                    │
          [Generate New JWT]
                    │
              [Retry Request]
```

---

## Why JWT + Refresh Tokens for URLCraft?

### 1. **Stateless Authentication**
- No session storage needed
- Scales horizontally (multiple servers)
- Reduced database queries

### 2. **Security**
- Password never sent after login
- Short-lived JWT limits exposure
- Refresh tokens can be revoked
- bcrypt protects passwords

### 3. **User-Specific URLs**
- Each shortened URL belongs to a user
- Users can only manage their own URLs
- Prevents unauthorized access

### 4. **Rate Limiting per User**
- Track API usage per user
- Enforce quotas (e.g., 1000 URLs/month)
- Fair resource allocation

### 5. **Audit Trail**
- Know who created/deleted each URL
- Track when URLs were accessed

---

## Database Schema Changes

### New `users` Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### New `refresh_tokens` Table
```sql
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Modified `urls` Table
```sql
ALTER TABLE urls ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE urls ADD COLUMN INDEX idx_user_id (user_id);
```

---

## JWT Secret & Configuration

### Environment Variables
```bash
# .env (create this file)
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
BCRYPT_ROUNDS=10
```

**Important:** 
- Use a strong, random 32+ character secret
- Never commit `.env` to Git
- Change in production

---

## API Endpoints

### Auth Endpoints
```
POST   /auth/register          - User registration
POST   /auth/login             - User login
POST   /auth/refresh           - Get new access token
POST   /auth/logout            - Revoke refresh token
``` 

### Protected Endpoints (Require JWT)
```
POST   /shorten               - Create short URL (for authenticated user)
POST   /shorten-bulk          - Bulk create (for authenticated user)
GET    /stats/:shortCode      - Get stats (for URL owner)
DELETE /shorten/:shortCode    - Delete URL (for URL owner)
GET    /my-urls               - List user's URLs
```

### Public Endpoints (No Auth)
```
GET    /:shortCode            - Redirect to original URL
GET    /                      - API info
```

---

## Security Best Practices Implemented

✅ **Password Hashing**: bcrypt with 10 salt rounds
✅ **Short JWT Expiry**: 15 minutes to limit exposure
✅ **Refresh Token Storage**: Stored in DB, can be revoked
✅ **Token Revocation**: Logout revokes refresh tokens
✅ **HTTPS Only**: Tokens should only be sent over HTTPS (in production)
✅ **Secure Headers**: CORS, XSS protection enabled
✅ **Rate Limiting**: Still applied per user

---

## Token Security Tips for Developers

### DO
✅ Store access token in memory or sessionStorage
✅ Store refresh token in secure httpOnly cookie
✅ Use HTTPS only in production
✅ Validate token expiry before using
✅ Revoke tokens on logout
✅ Refresh tokens proactively (before expiry)

### DON'T
❌ Store JWT in localStorage (XSS vulnerable)
❌ Use weak JWT secret
❌ Send tokens in query parameters
❌ Disable JWT signature verification
❌ Use long-lived JWTs
❌ Store refresh tokens in sessionStorage

---

## Example Usage Flow

### 1. Register New User
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "email": "alice@example.com",
    "password": "MyPassword123!"
  }'

# Response
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn": 900,
  "userId": 1
}
```

### 2. Create Short URL (Authenticated)
```bash
curl -X POST http://localhost:3000/shorten \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{
    "longUrl": "https://example.com/very/long/url",
    "expiresIn": "24h"
  }'
```

### 3. Access Token Expires, Use Refresh Token
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJ..."
  }'

# Response: New access token
{
  "accessToken": "eyJ...",
  "expiresIn": 900
}
```

### 4. Logout (Revoke Refresh Token)
```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJ..."
  }'
```

---

## Summary

| Feature | Benefit |
|---------|---------|
| **JWT** | Stateless, self-contained user authentication |
| **Refresh Token** | Long-lived token for getting new JWTs without re-login |
| **bcrypt** | Secure password hashing with salts |
| **Token Revocation** | Logout invalidates refresh tokens |
| **User-Specific URLs** | Each URL belongs to a user |
| **Rate Limiting** | Per-user API quotas |

This design ensures **security**, **scalability**, and **user isolation** in URLCraft! 🔐

---

**Phase 8 Complete!** Version 0.8.0 with JWT + Refresh Token authentication.
