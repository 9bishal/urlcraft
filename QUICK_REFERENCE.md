# URLCraft Quick Reference Guide

A quick lookup guide for common questions and solutions.

## Your 3 Questions - Quick Answers

### Q1: Why use a Map for storage?

**Short Answer:** Maps have O(1) (instant) lookup time. Finding a URL is super fast regardless of how many URLs you store.

**Code:**
```javascript
const urlMap = new Map();
urlMap.set('abc123', 'https://example.com');
const url = urlMap.get('abc123'); // Instant! ⚡
```

**Comparison with Array:**
- Map: 1 operation to find any item
- Array: ~500,000 operations to find 1 item (with 1 million items)

→ See `CONCEPTS.md` for full explanation

---

### Q2: What if two short codes collide?

**Short Answer:** Data gets overwritten! The old URL is lost.

**Current Implementation (Phase 1):**
```javascript
const shortCode = generateShortCode();
urlMap.set(shortCode, longUrl); // Overwrites if code exists!
```

**Phase 3 Fix:**
```javascript
function generateUniqueShortCode() {
  let code;
  do {
    code = generateShortCode();
  } while (urlMap.has(code)); // Keep trying until unique
  return code;
}
```

**Real Risk:** With 62 characters and 6-letter codes, you get 56.8 **billion** combinations. Collision is extremely unlikely in Phase 1.

→ See `CONCEPTS.md - Q2` for full explanation

---

### Q3: What if someone calls /shorten without longUrl?

**Short Answer:** We validate and return error 400 Bad Request.

**Code (lines 55-58 in src/index.js):**
```javascript
if (!longUrl) {
  return res.status(400).json({
    error: 'longUrl is required'
  });
}
```

**Response:**
```json
{
  "error": "longUrl is required"
}
Status: 400 Bad Request
```

→ See `CONCEPTS.md - Q3` for full explanation

---

### Q4: Browser vs Postman Redirects?

**Short Answer:**
- **Browser:** Follows redirect automatically (you see final page) ✅
- **Postman:** Shows the 301 response (you see the redirect)

**Code (line 94 in src/index.js):**
```javascript
res.redirect(301, originalUrl); // Browser follows this
```

**Browser Flow:**
```
Click /abc123 → See example.com content (automatic!)
```

**Postman Flow:**
```
GET /abc123 → See 301 status + Location header
```

→ See `CONCEPTS.md - Q4` for full explanation

---

## HTTP Status Codes

| Code | Name | When Used |
| --- | --- | --- |
| 201 | Created | POST /shorten succeeds |
| 400 | Bad Request | Missing/invalid input |
| 301 | Moved Permanently | Redirect to original URL |
| 404 | Not Found | Short code doesn't exist |
| 500 | Server Error | Server crash/bug |

---

## File Structure

```
urlcraft/
├── src/
│   └── index.js           ← Main server code
├── package.json           ← Dependencies & scripts
├── README.md              ← Project overview
├── CONCEPTS.md            ← Detailed Q&A (you are here!)
├── TESTING.md             ← Postman testing guide
└── .gitignore             ← Ignore files
```

---

## Common Commands

```bash
# Install dependencies (first time)
npm install

# Start server (development mode with auto-reload)
npm run dev

# Start server (production mode)
npm start
```

---

## Testing with Postman

### Create Short URL
```
POST http://localhost:3000/shorten
Body: { "longUrl": "https://example.com" }
Expected: 201 Created with shortCode
```

### Redirect to URL
```
GET http://localhost:3000/{shortCode}
Expected: 301 Redirect to original URL
```

### Test Error
```
POST http://localhost:3000/shorten
Body: {}
Expected: 400 Bad Request with error message
```

---

## Next Steps

1. Read `CONCEPTS.md` for detailed answers
2. Review `src/index.js` with this knowledge
3. Test all scenarios in Postman
4. Try to break the API with weird inputs
5. Ask follow-up questions!

---

## Phase 4: Redis Caching & Rate Limiting

### Install Phase 4 Dependencies

```bash
npm install redis express-rate-limit
```

### Start Redis

```bash
redis-cli ping  # Verify running
brew services start redis  # Start if not running
```

### Rate Limiting Config (30 requests per 15 minutes)

```javascript
const shortenRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // Time window
  max: 30,                   // Max requests
});
```

### Redis Cache Keys

```
url:{shortCode}     → Original URL
clicks:{shortCode}  → Click count
```

### Check Cache

```bash
redis-cli get url:aBcDeF
redis-cli keys "*"
redis-cli FLUSHALL  # Clear all
```

### Test Rate Limiting

```bash
# Hit the /shorten endpoint 35+ times
# First 30 requests: HTTP 201
# Requests 31+: HTTP 429 (rate limited)
```

### Verify Caching Works

```bash
# Create a short URL
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl": "https://example.com"}'

# Check it's cached in Redis
redis-cli get url:SHORTCODE
```

---
