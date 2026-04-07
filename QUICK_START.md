# URLCraft - Quick Start & API Reference

## Start Server
```bash
npm start
```

Server runs on `http://localhost:3000`

---

## API Endpoints

### 1. Create Short URL
```bash
curl -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{
    "longUrl": "https://example.com/very/long/url",
    "customCode": "my-link",
    "expiresIn": "24h"
  }'
```

**Parameters:**
- `longUrl` (required): The URL to shorten
- `customCode` (optional): Custom short code (3-30 chars, alphanumeric, dash, underscore)
- `expiresIn` (optional): Expiration time (30m, 1h, 24h, 7d)

**Response:**
```json
{
  "shortCode": "my-link",
  "shortUrl": "http://localhost:3000/my-link",
  "originalUrl": "https://example.com/very/long/url",
  "isCustom": true,
  "expiresAt": "2026-04-06T14:30:00.000Z"
}
```

---

### 2. Bulk Create URLs
```bash
curl -X POST http://localhost:3000/shorten-bulk \
  -H 'Content-Type: application/json' \
  -d '{
    "urls": [
      {"longUrl": "https://example.com/1", "expiresIn": "1h"},
      {"longUrl": "https://example.com/2", "customCode": "link2"},
      {"longUrl": "https://example.com/3"}
    ]
  }'
```

**Response:**
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
    }
  ]
}
```

---

### 3. Redirect
```bash
curl -L http://localhost:3000/my-link
```

Redirects to the original URL. Returns `410 Gone` if URL has expired.

---

### 4. Get Stats
```bash
curl http://localhost:3000/stats/my-link
```

**Response:**
```json
{
  "shortCode": "my-link",
  "shortUrl": "http://localhost:3000/my-link",
  "originalUrl": "https://example.com/very/long/url",
  "clicks": 5,
  "isCustom": true,
  "createdAt": "2026-04-05T09:18:56.277Z",
  "expiresAt": "2026-04-06T14:30:00.000Z",
  "isExpired": false
}
```

---

## Expiration Formats

| Format | Duration | Example |
| --- | --- | --- |
| `30m` | 30 minutes | `"expiresIn": "30m"` |
| `1h` | 1 hour | `"expiresIn": "1h"` |
| `24h` | 24 hours | `"expiresIn": "24h"` |
| `7d` | 7 days | `"expiresIn": "7d"` |

---

## Error Codes

| Code | Meaning | Example |
| --- | --- | --- |
| 400 | Bad request | Missing `longUrl` or invalid format |
| 404 | Not found | Short code doesn't exist |
| 409 | Conflict | Custom code already taken |
| 410 | Gone | URL has expired |
| 429 | Rate limited | Too many requests from your IP |
| 500 | Server error | Internal error |

---

## Examples

### Create a temporary link (expires in 1 hour)
```bash
curl -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"longUrl": "https://example.com/secret", "expiresIn": "1h"}'
```

### Create a short link with custom code
```bash
curl -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{
    "longUrl": "https://example.com/my-article",
    "customCode": "article-123"
  }'
```

### Create a permanent link
```bash
curl -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"longUrl": "https://example.com/permanent"}'
```

### Create 5 short links at once
```bash
curl -X POST http://localhost:3000/shorten-bulk \
  -H 'Content-Type: application/json' \
  -d '{
    "urls": [
      {"longUrl": "https://example.com/1"},
      {"longUrl": "https://example.com/2"},
      {"longUrl": "https://example.com/3"},
      {"longUrl": "https://example.com/4"},
      {"longUrl": "https://example.com/5"}
    ]
  }'
```

---

## Database Setup

```bash
# Create database
createdb urlcraft_db

# Start application (auto-initializes schema)
npm start
```

---

## Features

✅ Create short URLs with optional custom codes  
✅ Redirect with automatic click tracking  
✅ View analytics for each short URL  
✅ Create up to 100 URLs at once  
✅ Set expiration times (temporary URLs)  
✅ Redis caching for performance  
✅ Rate limiting for abuse prevention  
✅ Modular, maintainable code  

---

## Performance

- **Caching:** Redis with 24h TTL
- **Database:** PostgreSQL with optimized indexes
- **Rate Limiting:** 100 requests per 15 minutes per IP
- **Bulk Operations:** Up to 100 URLs per request

---

## Status

- Phase: **Phase 7 - URL Expiration** ✅ Complete
- Version: **0.6.0**
- Status: **Production Ready** 🚀
