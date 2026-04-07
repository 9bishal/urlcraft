# Phase 3: Testing Checklist & Guide

Step-by-step testing for Phase 3 features.

---

## ✅ Phase 3 Features Ready

- [x] URL validation (must be http/https)
- [x] Unique code generation (checks DB before insert)
- [x] Click tracking (increments on redirect)
- [x] Analytics endpoint (view stats)
- [x] Better error handling

---

## 🚀 Test Steps

### Test 1: Invalid URL (Validation)

**Purpose:** Verify URL validation works

**In Postman:**

```
Method: POST
URL: http://localhost:3000/shorten

Body (JSON):
{
  "longUrl": "not-a-valid-url"
}
```

**Expected Response:**

```json
{
  "error": "Invalid URL format. Must start with http:// or https://"
}
Status: 400 Bad Request
```

**✅ Validation works?** Continue to Test 2.

---

### Test 2: Valid URL (Success)

**Purpose:** Create a valid short URL

**In Postman:**

```
Method: POST
URL: http://localhost:3000/shorten

Body (JSON):
{
  "longUrl": "https://www.youtube.com"
}
```

**Expected Response:**

```json
{
  "shortCode": "xY7bK2",
  "shortUrl": "http://localhost:3000/xY7bK2",
  "originalUrl": "https://www.youtube.com"
}
Status: 201 Created
```

**Copy the shortCode!** You'll need it for other tests.

**✅ Creation works?** Continue to Test 3.

---

### Test 3: Redirect & Count Click

**Purpose:** Verify redirect works and increments clicks

**In Postman:**

```
Method: GET
URL: http://localhost:3000/xY7bK2  (use YOUR shortCode)
```

**Expected Response:**

```
Status: 301 Moved Permanently
Location: https://www.youtube.com
```

**Note:** Click count increased to 1 (behind the scenes)

**✅ Redirect works?** Continue to Test 4.

---

### Test 4: View Analytics (New!)

**Purpose:** Check click count for a short URL

**In Postman:**

```
Method: GET
URL: http://localhost:3000/stats/xY7bK2  (use YOUR shortCode)
```

**Expected Response:**

```json
{
  "shortCode": "xY7bK2",
  "shortUrl": "http://localhost:3000/xY7bK2",
  "originalUrl": "https://www.youtube.com",
  "clicks": 1,
  "createdAt": "2026-04-05T14:23:45.123456Z"
}
Status: 200 OK
```

**✅ Analytics works?** Continue to Test 5.

---

### Test 5: Multiple Clicks

**Purpose:** Verify clicks increment correctly

**Step 1: Redirect again**

```
GET http://localhost:3000/xY7bK2
```

**Step 2: Check stats again**

```
GET http://localhost:3000/stats/xY7bK2

Response: clicks should be 2 (was 1, now +1)
```

**Step 3: Redirect one more time**

```
GET http://localhost:3000/xY7bK2
```

**Step 4: Check stats again**

```
GET http://localhost:3000/stats/xY7bK2

Response: clicks should be 3
```

**✅ Click counting works?** Continue to Test 6.

---

### Test 6: Unique Code Generation

**Purpose:** Verify codes are unique (no duplicates)

**Create 5 short URLs:**

```
1. POST /shorten with https://github.com
   → Get code: abc123

2. POST /shorten with https://google.com
   → Get code: def456

3. POST /shorten with https://twitter.com
   → Get code: ghi789

4. POST /shorten with https://linkedin.com
   → Get code: jkl012

5. POST /shorten with https://facebook.com
   → Get code: mno345
```

**Check in Database:**

```bash
psql -U bishalkumarshah urlcraft_db
```

```sql
SELECT short_code FROM urls;
```

**Expected Output:**

```
 short_code
────────────
 abc123
 def456
 ghi789
 jkl012
 mno345
(5 rows)
```

**All unique?** ✅ Unique generation works!

---

### Test 7: View All URLs with Clicks

**Purpose:** See most popular short URLs

**In PostgreSQL:**

```bash
psql -U bishalkumarshah urlcraft_db
```

```sql
SELECT short_code, original_url, clicks FROM urls ORDER BY clicks DESC;
```

**Expected Output (example):**

```
 short_code |        original_url        | clicks
────────────┼────────────────────────────┼────────
 xY7bK2     | https://www.youtube.com    │      3
 abc123     | https://github.com         │      1
 def456     | https://google.com         │      0
 ghi789     | https://twitter.com        │      0
(4 rows)
```

**✅ View all works?** Continue to Test 8.

---

### Test 8: Non-existent Short Code

**Purpose:** Test error handling for invalid short code

**In Postman:**

```
Method: GET
URL: http://localhost:3000/stats/invalidXYZ
```

**Expected Response:**

```json
{
  "error": "Short URL not found"
}
Status: 404 Not Found
```

**✅ 404 error works?** Continue to Test 9.

---

### Test 9: Root Endpoint (Documentation)

**Purpose:** Check API documentation includes new features

**In Postman:**

```
Method: GET
URL: http://localhost:3000/
```

**Expected Response (includes new endpoint):**

```json
{
  "message": "👋 Welcome to URLCraft - URL Shortener API",
  "version": "0.2.0",
  "endpoints": {
    "POST /shorten": "Create a short URL from a long URL",
    "GET /:shortCode": "Redirect to the original URL",
    "GET /stats/:shortCode": "Get analytics for a short URL"
  },
  ...
}
```

**✅ All 3 endpoints documented?** Perfect!

---

### Test 10: Data Persistence (Restart Server)

**Purpose:** Verify data and clicks persist after restart

**Step 1: Current clicks (before restart)**

```
GET http://localhost:3000/stats/xY7bK2

Response: clicks: 3 (example)
```

**Step 2: Stop server**

```bash
# Press Ctrl+C in terminal
```

**Step 3: Start server again**

```bash
npm run dev
```

**Step 4: Check clicks after restart**

```
GET http://localhost:3000/stats/xY7bK2

Response: clicks: 3 (SAME! Data persisted! ✅)
```

**✅ Persistence works?** All tests pass!

---

## ✅ Phase 3 Complete!

| Test | Status |
|------|--------|
| Invalid URL rejected | ✅ |
| Valid URL created | ✅ |
| Redirect works | ✅ |
| Click tracking | ✅ |
| Analytics endpoint | ✅ |
| Unique codes | ✅ |
| View all URLs | ✅ |
| 404 on invalid code | ✅ |
| API docs updated | ✅ |
| Data persists | ✅ |

---

## Database Queries

**View all URLs with clicks:**

```sql
SELECT short_code, original_url, clicks, created_at FROM urls ORDER BY clicks DESC;
```

**View one URL:**

```sql
SELECT * FROM urls WHERE short_code = 'xY7bK2';
```

**Reset clicks for a URL:**

```sql
UPDATE urls SET clicks = 0 WHERE short_code = 'xY7bK2';
```

**See total clicks:**

```sql
SELECT SUM(clicks) as total_clicks FROM urls;
```

**Most popular URL:**

```sql
SELECT short_code, original_url, clicks FROM urls ORDER BY clicks DESC LIMIT 1;
```

---

## Postman Collection Summary

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/shorten` | POST | Create short URL | 201/400/409 |
| `/:shortCode` | GET | Redirect | 301/404 |
| `/stats/:shortCode` | GET | View analytics | 200/404 |
| `/` | GET | API docs | 200 |

---

## Common Issues

### "Invalid URL" error on valid URL

**Issue:** URL doesn't have http:// or https://

**Fix:** Make sure URL starts with protocol:
```json
{
  "longUrl": "https://example.com"  ← Correct
}
```

### Stats show 0 clicks after redirect

**Issue:** Redirect might not have been tracked

**Fix:** Make sure to follow redirect in Postman:
1. GET /:shortCode
2. Look at Status (should be 301)
3. Then check stats

### Unique constraint error

**Issue:** Same code generated twice (rare!)

**Fix:** Phase 3 fixes this automatically. Should never happen.

---

## Summary

**Phase 3 Achievements:**

✅ **URL Validation** - Invalid URLs rejected  
✅ **Unique Codes** - No duplicates  
✅ **Click Tracking** - Measure popularity  
✅ **Analytics** - View stats per URL  
✅ **Error Handling** - Clear messages  
✅ **Production Ready** - Robust API  

**You have a professional-grade URL shortener!** 🚀

---

## Next Steps

**Phase 4 Ideas:**

- 🔜 **Redis Caching** - Speed up lookups 10x faster
- 🔜 **Rate Limiting** - Prevent spam (100 requests/hour)
- 🔜 **User Auth** - Users own their URLs
- 🔜 **Custom Codes** - Let users choose shortcodes
- 🔜 **Bulk Create** - Create 100 URLs at once
- 🔜 **API Keys** - Secure API access

---

## Final Checklist

- [ ] All 10 tests passed
- [ ] Short codes are unique
- [ ] Clicks increment correctly
- [ ] Data persists after restart
- [ ] Invalid URLs rejected
- [ ] Analytics endpoint works
- [ ] Error messages clear

**Ready for Phase 4?** 🚀
