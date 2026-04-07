# Phase 8: JWT + Refresh Tokens - Quick Reference

## 🔐 What is JWT + Refresh Tokens?

**JWT (JSON Web Token)** = A secure, stateless token containing user info
**Refresh Token** = A long-lived token used to get new JWTs when they expire

## ⏱️ Token Lifetimes
- **Access Token**: 15 minutes (use this for API calls)
- **Refresh Token**: 7 days (stored in database, can be revoked)

## 🚀 Quick Start

### 1️⃣ Register User
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "email": "alice@example.com",
    "password": "SecurePass123!"
  }'
```

Get back: `accessToken`, `refreshToken`, `userId`

### 2️⃣ Create Short URL (Use Access Token)
```bash
curl -X POST http://localhost:3000/shorten \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"longUrl": "https://example.com"}'
```

### 3️⃣ Token Expired? Refresh It
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
```

Get back: New `accessToken` (use immediately)

### 4️⃣ Logout (Revoke Refresh Token)
```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
```

## 📚 All Auth Endpoints

| Method | Endpoint | Authentication | Purpose |
|--------|----------|-----------------|---------|
| POST | `/auth/register` | No | Create new account |
| POST | `/auth/login` | No | Login existing user |
| POST | `/auth/refresh` | No | Get new access token |
| POST | `/auth/logout` | Yes | Logout & revoke token |

## 🔒 Protected Endpoints (Require Access Token)

- `POST /shorten` - Create short URL
- `POST /shorten-bulk` - Bulk create
- `GET /my-urls` - List your URLs
- `GET /stats/:code` - Get stats
- `DELETE /shorten/:code` - Delete URL
- `GET /all-urls` - List all URLs

## 📍 Public Endpoints (No Auth)

- `GET /:shortCode` - Redirect to URL
- `GET /` - API info

## 🛡️ Security Best Practices

✅ Always send access token in header: `Authorization: Bearer <token>`
✅ Store refresh token securely (httpOnly cookie in browser)
✅ Never expose tokens in URL parameters
✅ Let access tokens expire frequently
✅ Refresh tokens when access token expires
✅ Logout revokes refresh tokens

## ❌ Security Problems to Avoid

❌ Storing tokens in localStorage (XSS vulnerable)
❌ Sending tokens via URL query parameters
❌ Using weak passwords
❌ Sharing tokens with other users
❌ Long-lived access tokens

## 📝 Example: Full Auth Flow

```bash
# Step 1: Register
ACCESS=$(curl -s -X POST http://localhost:3000/auth/register \
  -d '{"username":"john","email":"john@x.com","password":"Pass123!"}' \
  -H "Content-Type: application/json" | jq -r .accessToken)

# Step 2: Use token to create URL
curl -X POST http://localhost:3000/shorten \
  -H "Authorization: Bearer $ACCESS" \
  -d '{"longUrl":"https://example.com"}' \
  -H "Content-Type: application/json"

# Step 3: List your URLs
curl http://localhost:3000/my-urls \
  -H "Authorization: Bearer $ACCESS"
```

---

**That's it!** JWT + Refresh Tokens = Secure stateless authentication 🔐
