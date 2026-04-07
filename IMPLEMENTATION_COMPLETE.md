# URLCraft - URL Shortener API
## Implementation Status: COMPLETE ✅

### Project Overview
URLCraft is a modular, production-ready URL shortener API built with Node.js, Express, PostgreSQL, and Redis.

**Current Version:** 0.6.0  
**Phase:** Phase 7 - URL Expiration  
**Status:** Fully Implemented & Tested

---

## Architecture

### Modular Structure
The codebase has been refactored into clean, maintainable modules:

```
src/
├── index.js       # Application entry point
├── config.js      # Database & Redis configuration
├── helpers.js     # Utility functions (validation, code generation, expiration)
├── middleware.js  # Express middleware (rate limiting, error handling)
└── routes.js      # API routes & endpoints
```

### Key Components

#### 1. **config.js** - Configuration Management
- PostgreSQL connection pool setup
- Redis client initialization
- Connection error handling
- Environment-aware configuration

#### 2. **helpers.js** - Core Business Logic
Functions implemented:
- `generateShortCode()` - Generate random 6-character codes
- `isValidUrl()` - Validate URL format (http/https)
- `isValidCustomCode()` - Validate custom codes (3-30 chars, alphanumeric, dash, underscore)
- `codeExists()` - Check if code is already taken
- `getOrGenerateCode()` - Handle custom or auto-generated codes
- `parseExpiration()` - Parse expiration strings (30m, 24h, 7d)
- `isUrlExpired()` - Check if URL has expired

#### 3. **routes.js** - API Endpoints

**Implemented Endpoints:**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/shorten` | Create single short URL |
| POST | `/shorten-bulk` | Create multiple short URLs |
| GET | `/:shortCode` | Redirect to original URL |
| GET | `/stats/:shortCode` | Get URL analytics |
| GET | `/` | API documentation |

#### 4. **middleware.js** - Cross-Cutting Concerns
- Rate limiting (per IP, configurable)
- Error handling middleware
- Request/response logging
- CORS support

#### 5. **index.js** - Application Setup
- Express server initialization
- Middleware registration
- Route mounting
- Server startup and graceful shutdown

---

## Implemented Features

### ✅ Phase 1: Basic URL Shortening
- Generate random 6-character codes
- Store original → short URL mappings
- Redirect functionality
- Database persistence

### ✅ Phase 2: URL Analytics
- Click tracking and statistics
- Creation timestamp recording
- Per-URL analytics endpoint
- Total clicks display

### ✅ Phase 3: Custom Codes
- Allow users to specify custom short codes
- Code availability checking
- Code format validation (3-30 chars)
- Conflict resolution

### ✅ Phase 4: Redis Caching
- In-memory URL caching
- Automatic cache invalidation (24h TTL)
- Click count caching
- Fallback to database on cache miss
- Connection status monitoring

### ✅ Phase 5: Rate Limiting
- Per-IP rate limiting
- Configurable time windows (15 minutes)
- Configurable request limits (100 per window)
- Graceful error responses with retry-after headers

### ✅ Phase 6: Bulk URL Creation
- Create up to 100 URLs in single request
- Batch error handling
- Custom codes in bulk operations
- Partial success responses

### ✅ Phase 7: URL Expiration
- Temporary URL creation with TTL
- Expiration format support: `30m`, `1h`, `24h`, `7d`
- Automatic expiration checking
- Expired URL validation (returns HTTP 410)
- Expiration status in analytics
- Database TTL column support
- Redis cache respects expiration

---

## Database Schema

### Main Table: `urls`

```sql
CREATE TABLE urls (
  id SERIAL PRIMARY KEY,
  short_code VARCHAR(30) UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_custom BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP,           -- Phase 7: Expiration time
  is_expired BOOLEAN DEFAULT FALSE -- Phase 7: Expiration flag
);

CREATE INDEX idx_short_code ON urls(short_code);
```

---

## API Endpoints - Full Reference

### 1. Create Short URL
```http
POST /shorten
Content-Type: application/json

{
  "longUrl": "https://example.com/very/long/path",
  "customCode": "my-link",           // Optional
  "expiresIn": "24h"                 // Optional: 30m, 1h, 24h, 7d
}
```

**Response (201):**
```json
{
  "shortCode": "my-link",
  "shortUrl": "http://localhost:3000/my-link",
  "originalUrl": "https://example.com/very/long/path",
  "isCustom": true,
  "expiresAt": "2026-04-06T14:30:00.000Z"
}
```

---

### 2. Bulk Create Short URLs
```http
POST /shorten-bulk
Content-Type: application/json

{
  "urls": [
    {
      "longUrl": "https://example.com/1",
      "expiresIn": "1h"
    },
    {
      "longUrl": "https://example.com/2",
      "customCode": "custom-2",
      "expiresIn": "24h"
    },
    {
      "longUrl": "https://example.com/3"    // No expiration (permanent)
    }
  ]
}
```

**Response (201):**
```json
{
  "created": 3,
  "failed": 0,
  "results": [
    {
      "shortCode": "AbCdEf",
      "shortUrl": "http://localhost:3000/AbCdEf",
      "originalUrl": "https://example.com/1",
      "isCustom": false,
      "expiresAt": "2026-04-05T10:19:05.647Z"
    },
    // ... more results
  ],
  "errors": null
}
```

---

### 3. Redirect to Original URL
```http
GET /:shortCode
```

**Success Response (301):**
- Redirects to original URL
- Increments click counter
- Updates Redis cache

**Expired URL Response (410):**
```json
{
  "error": "This short URL has expired"
}
```

**Not Found Response (404):**
```json
{
  "error": "Short URL not found"
}
```

---

### 4. Get URL Analytics
```http
GET /stats/:shortCode
```

**Response (200):**
```json
{
  "shortCode": "my-link",
  "shortUrl": "http://localhost:3000/my-link",
  "originalUrl": "https://example.com/custom",
  "clicks": 5,
  "isCustom": true,
  "createdAt": "2026-04-05T09:18:56.277Z",
  "expiresAt": "2026-04-12T09:18:56.277Z",
  "isExpired": false
}
```

---

### 5. API Documentation
```http
GET /
```

Returns comprehensive API documentation with examples and supported formats.

---

## Configuration

### Environment Variables
Create a `.env` file:
```env
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=urlcraft_db
DB_USER=bishalkumarshah
DB_PASSWORD=

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Server
PORT=3000
NODE_ENV=development

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100      # Max requests per window
```

### Database Setup
```bash
# Create database
createdb urlcraft_db

# Initialize schema
psql urlcraft_db < schema.sql

# Or run application - schema auto-initializes
npm start
```

---

## Installation & Usage

### Prerequisites
- Node.js 14+
- PostgreSQL 12+
- Redis 6+ (optional, but recommended)

### Setup
```bash
# Install dependencies
npm install

# Start server
npm start
```

### Test
```bash
# Run full test suite
npm test

# Test specific endpoint
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl": "https://example.com"}'
```

---

## Performance Considerations

### Caching Strategy
- **URLs:** 24-hour TTL in Redis
- **Click counts:** Cached separately with 24-hour TTL
- **Database fallback:** Automatic if cache misses
- **Expiration:** Checked at access time, not cached

### Rate Limiting
- Per-IP rate limiting: 100 requests per 15 minutes
- Prevents abuse and DoS attacks
- Returns `429 Too Many Requests` when exceeded

### Database Optimization
- Indexed `short_code` column for fast lookups
- Connection pooling (default 10 connections)
- Prepared statements prevent SQL injection

---

## Error Handling

### Standard Error Responses

| Status | Scenario |
|--------|----------|
| 400 | Bad request (invalid URL, missing fields) |
| 404 | Short code not found |
| 409 | Custom code already taken |
| 410 | URL has expired |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## Testing Results

### Phase 7 (URL Expiration) - Verified ✅

```
✅ Basic URL creation without expiration
✅ URL creation with 30-minute expiration
✅ URL creation with custom code and expiration
✅ Bulk creation with mixed expiration settings
✅ Redirect to valid non-expired URL
✅ Redirect to expired URL (returns 410)
✅ Stats for non-expired URL (shows isExpired: false)
✅ Stats for expired URL (shows isExpired: true)
✅ All expiration formats supported (30m, 1h, 24h, 7d)
✅ Redis caching with expiration support
✅ Database schema with TTL columns
```

---

## Future Enhancements

### Potential Phase 8+ Features
1. **User Accounts** - Track URLs by user
2. **QR Codes** - Generate QR codes for short URLs
3. **Analytics Dashboard** - Web UI for statistics
4. **Custom Domain Support** - Use custom domains for shortened URLs
5. **Password Protection** - Optional password for sensitive URLs
6. **API Keys** - Authentication for programmatic access
7. **URL Preview** - Preview destination before redirect
8. **Geo-Targeting** - Redirect based on user location
9. **A/B Testing** - Route split for testing variants
10. **Webhooks** - Notify on URL access events

---

## Code Quality

- ✅ Modular architecture with separation of concerns
- ✅ No unnecessary dependencies or bloat
- ✅ Error handling on all endpoints
- ✅ Input validation on all user inputs
- ✅ SQL injection prevention (parameterized queries)
- ✅ Clean, readable code with comments
- ✅ Comprehensive error messages
- ✅ Production-ready configuration

---

## Troubleshooting

### Redis Connection Issues
```
⚠️ Redis connection error: connect ECONNREFUSED
```
**Solution:** Redis is optional. The application will continue working without it, using only the database.

### Database Connection Issues
```
error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution:** Ensure PostgreSQL is running and the database exists:
```bash
pg_ctl start              # Start PostgreSQL
createdb urlcraft_db      # Create database
npm start                 # Start application
```

### Rate Limit Exceeded
```
429 Too Many Requests
```
**Solution:** Wait 15 minutes or increase rate limit settings in middleware.

---

## Summary

URLCraft is a complete, production-ready URL shortener API with:
- ✅ Modular, maintainable codebase
- ✅ 7 implemented phases with comprehensive feature set
- ✅ Redis caching for high performance
- ✅ Rate limiting for abuse prevention
- ✅ URL expiration with TTL support
- ✅ Bulk operations support
- ✅ Complete error handling
- ✅ Comprehensive testing

**Ready for deployment and production use.**
