# Phase 3: Improvements & Error Handling Guide

Complete guide to Phase 3 features and improvements.

---

## Overview

**Phase 2** had basic functionality but lacked robustness.  
**Phase 3** adds validation, unique code generation, and analytics! ✅

---

## What We Built in Phase 3

### 1. URL Validation

Check if the URL is in valid format before saving.

```javascript
function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (error) {
    return false;
  }
}
```

**Validates:**
- ✅ `https://github.com` - Valid
- ✅ `http://example.com/path` - Valid
- ❌ `not-a-url` - Invalid (no protocol)
- ❌ `ftp://example.com` - Invalid (wrong protocol)

---

### 2. Unique Code Generation

Check if code already exists before inserting (Phase 3 improvement).

```javascript
async function generateUniqueShortCode() {
  let shortCode;
  let isUnique = false;

  while (!isUnique) {
    shortCode = generateShortCode();

    // Check if this code already exists
    const result = await pool.query(
      'SELECT id FROM urls WHERE short_code = $1',
      [shortCode]
    );

    // If no rows found, code is unique
    if (result.rows.length === 0) {
      isUnique = true;
    }
  }

  return shortCode;
}
```

**What This Does:**

```
Generate code → Check if exists → If exists, generate new one → If unique, use it
```

**Before (Phase 2):**
```
Generate code → Insert
Problem: Rare collision error if same code generated twice
```

**After (Phase 3):**
```
Generate code → Check DB → If exists, retry → Guaranteed unique!
```

---

### 3. Click Tracking (Analytics)

Track how many times each short URL was clicked.

**Database Change:**

```sql
ALTER TABLE urls ADD COLUMN clicks INTEGER DEFAULT 0;
```

**New Table Structure:**

```
Table: urls

┌────┬────────────┬──────────────────┬───────────────┬───────┐
│ id │ short_code │  original_url    │  created_at   │ clicks│
├────┼────────────┼──────────────────┼───────────────┼───────┤
│ 1  │ gJRLf7     │ https://github.. │ 2026-04-05... │ 5     │
│ 2  │ 3uxNRD     │ https://shahbis..│ 2026-04-05... │ 2     │
│ 3  │ xxW29f     │ https://github.. │ 2026-04-05... │ 0     │
└────┴────────────┴──────────────────┴───────────────┴───────┘
```

**Increment on Redirect:**

```javascript
// Every time someone visits the short URL
await pool.query(
  'UPDATE urls SET clicks = clicks + 1 WHERE short_code = $1',
  [shortCode]
);
```

---

### 4. Analytics Endpoint

View statistics for a short URL.

```javascript
GET /stats/:shortCode
```

**Example Request:**

```
GET http://localhost:3000/stats/gJRLf7
```

**Example Response:**

```json
{
  "shortCode": "gJRLf7",
  "shortUrl": "http://localhost:3000/gJRLf7",
  "originalUrl": "https://shahbishal.com.np/",
  "clicks": 5,
  "createdAt": "2026-04-05T12:31:13.412974Z"
}
```

---

### 5. Better Error Handling

Handle database errors gracefully.

**Database Constraint Error:**

```javascript
if (error.code === '23505') {
  // Unique constraint violation
  return res.status(409).json({
    error: 'This short code already exists. Please try again.'
  });
}
```

**HTTP Status Codes Used:**

| Code | Meaning | When |
|------|---------|------|
| **201** | Created | Short URL successfully created |
| **400** | Bad Request | Invalid input (no longUrl, invalid URL) |
| **404** | Not Found | Short code doesn't exist |
| **409** | Conflict | Unique constraint violation |
| **500** | Server Error | Database or unexpected error |

---

## Testing Phase 3

### Test 1: Create with Invalid URL

**Request:**

```
POST http://localhost:3000/shorten
Body: { "longUrl": "not-a-url" }
```

**Expected Response:**

```json
{
  "error": "Invalid URL format. Must start with http:// or https://"
}
Status: 400 Bad Request
```

✅ Validation works!

---

### Test 2: Create Valid Short URL

**Request:**

```
POST http://localhost:3000/shorten
Body: { "longUrl": "https://example.com" }
```

**Expected Response:**

```json
{
  "shortCode": "aBc123",
  "shortUrl": "http://localhost:3000/aBc123",
  "originalUrl": "https://example.com"
}
Status: 201 Created
```

✅ Creation works!

---

### Test 3: Increment Click Count

**Step 1: Create short URL**

```
POST /shorten with https://example.com
Get shortCode: "aBc123"
```

**Step 2: Visit short URL (Postman)**

```
GET http://localhost:3000/aBc123
(Redirects to https://example.com)
Clicks: 1
```

**Step 3: Visit again**

```
GET http://localhost:3000/aBc123
(Redirects to https://example.com)
Clicks: 2
```

**Step 4: Check analytics**

```
GET http://localhost:3000/stats/aBc123

Response:
{
  "shortCode": "aBc123",
  "shortUrl": "http://localhost:3000/aBc123",
  "originalUrl": "https://example.com",
  "clicks": 2,
  "createdAt": "2026-04-05T..."
}
```

✅ Click tracking works!

---

### Test 5: View All URLs with Clicks

**In PostgreSQL:**

```bash
psql -U bishalkumarshah urlcraft_db
```

```sql
SELECT short_code, original_url, clicks FROM urls ORDER BY clicks DESC;
```

**Output:**

```
 short_code |    original_url     | clicks
────────────┼─────────────────────┼────────
 gJRLf7     | https://shahbishal..│      5
 xxW29f     | https://github.com  │      2
 3uxNRD     | https://shahbishal..│      0
(3 rows)
```

---

## Code Changes Summary

### Before (Phase 2)

```javascript
// No validation
if (!longUrl) { ... }

// Just random code 
const shortCode = generateShortCode();

// Insert (might error on collision)
await pool.query('INSERT...', [shortCode, longUrl]);

// No click tracking
res.redirect(301, originalUrl);
```

### After (Phase 3)

```javascript
// Validate URL format
if (!isValidUrl(longUrl)) { ... }

// Generate unique code (checks DB)
const shortCode = await generateUniqueShortCode();

// Insert with error handling
try {
  await pool.query('INSERT...', [shortCode, longUrl]);
} catch (error) {
  if (error.code === '23505') { ... }
}

// Track clicks
await pool.query('UPDATE urls SET clicks = clicks + 1...');
```

---

## Database Schema (Phase 3)

```sql
CREATE TABLE urls (
  id SERIAL PRIMARY KEY,
  short_code VARCHAR(10) UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  clicks INTEGER DEFAULT 0  ← NEW in Phase 3
);
```

---

## API Endpoints (Phase 3)

| Method | Endpoint | Purpose | Status Code |
|--------|----------|---------|-------------|
| POST | `/shorten` | Create short URL | 201/400/409/500 |
| GET | `/:shortCode` | Redirect to original | 301/404/500 |
| GET | `/stats/:shortCode` | View analytics | 200/404/500 |
| GET | `/` | API documentation | 200 |

---

## Error Messages

### Invalid URL

```json
{
  "error": "Invalid URL format. Must start with http:// or https://"
}
```

### Missing longUrl

```json
{
  "error": "longUrl is required"
}
```

### Short Code Not Found

```json
{
  "error": "Short URL not found"
}
```

### Server Error

```json
{
  "error": "Failed to create short URL"
}
```

---

## Phase 3 Achievements

✅ **URL Validation** - Only valid URLs accepted  
✅ **Unique Code Generation** - No duplicate codes  
✅ **Click Tracking** - Know how popular each URL is  
✅ **Analytics Endpoint** - View stats per short URL  
✅ **Better Error Handling** - Clear error messages  
✅ **Production Ready** - Robust and reliable  

---

## Next Steps (Phase 4+)

- 🔜 **Redis Caching** - Speed up lookups with cache
- 🔜 **Rate Limiting** - Prevent abuse (max 100 requests/hour)
- 🔜 **User Authentication** - Users own their URLs
- 🔜 **Custom Short Codes** - Let users choose codes
- 🔜 **Bulk URL Shortening** - Create 100s at once
- 🔜 **API Keys** - Secure API access

---

## Quick Commands

```bash
# Start server
npm run dev

# View all URLs with click counts
psql -U bishalkumarshah urlcraft_db
SELECT short_code, original_url, clicks FROM urls ORDER BY clicks DESC;

# View specific URL stats
SELECT * FROM urls WHERE short_code = 'gJRLf7';

# Reset click count
UPDATE urls SET clicks = 0 WHERE short_code = 'gJRLf7';

# Delete a short URL
DELETE FROM urls WHERE short_code = 'gJRLf7';
```

---

## Testing Checklist

- [ ] Create short URL with invalid URL → 400 error
- [ ] Create short URL with valid URL → 201 success
- [ ] Redirect to short URL → 301 redirect works
- [ ] Click multiple times → clicks increment
- [ ] View stats → clicks count matches
- [ ] Invalid short code → 404 error
- [ ] Database persists data → restart server, data exists
- [ ] Multiple short URLs created → each has unique code

---

## Summary

**Phase 3 Achievement:** ✅

You now have a **production-grade URL shortener** with:
- Persistent storage (PostgreSQL)
- Input validation
- Unique code generation
- Analytics and click tracking
- Error handling
- RESTful API

**You're ready for real-world use!** 🚀

Next: Phase 4 (Redis caching, rate limiting, auth)

---

## Questions?

**Understanding URL Validation?**
- URL must start with `http://` or `https://`
- Uses JavaScript's built-in `URL` constructor
- Prevents saving invalid URLs

**Unique Code Generation?**
- Checks database before returning code
- Loop: generate → check → exists? → repeat
- Guaranteed no duplicates!

**Click Tracking?**
- Every redirect increments `clicks` column
- View stats with `/stats/shortCode`
- Ordered by popularity

Ready to test Phase 3? Jump to **PHASE3_TESTING.md**! 🎯
