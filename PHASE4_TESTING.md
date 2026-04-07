# Phase 4: Testing Checklist - Redis Caching & Rate Limiting

## Pre-Test Verification

- [ ] Redis is installed: `redis-cli --version`
- [ ] Redis is running: `redis-cli ping` (should return PONG)
- [ ] PostgreSQL is running: `psql -U bishalkumarshah -d urlcraft_db -c "SELECT 1"`
- [ ] URLCraft dependencies installed: `npm list redis express-rate-limit`
- [ ] Server starts without errors: `npm run dev`
- [ ] Welcome endpoint works: Visit `http://localhost:3000`

---

## Test 1: Redis Caching (URL Lookup)

### Purpose
Verify that Redis caches URLs for faster retrieval.

### Steps

1. **Create a new short URL:**
   ```bash
   curl -X POST http://localhost:3000/shorten \
     -H "Content-Type: application/json" \
     -d '{"longUrl": "https://www.github.com"}'
   ```
   Copy the `shortCode` from response (e.g., `aBcDeF`)

2. **Verify cache entry in Redis:**
   ```bash
   redis-cli get url:aBcDeF
   # Should return: https://www.github.com
   ```

3. **Visit the short URL:**
   ```bash
   curl -L http://localhost:3000/aBcDeF
   # Should redirect to https://www.github.com
   ```

4. **Check click counter in Redis:**
   ```bash
   redis-cli get clicks:aBcDeF
   # Should return: 1 (or higher if tested multiple times)
   ```

### Expected Results

- ✅ URL appears in Redis after creation
- ✅ Redirect works and increments clicks
- ✅ Click counter appears in Redis

---

## Test 2: Cache Hit Performance

### Purpose
Verify that subsequent requests use cache (faster).

### Steps

1. **Create a short URL** (from Test 1)

2. **Monitor cache hits with Redis:**
   ```bash
   # In a separate terminal, watch Redis commands
   redis-cli monitor
   ```

3. **Make multiple redirect requests:**
   ```bash
   for i in {1..5}; do
     curl -L http://localhost:3000/aBcDeF
     sleep 0.1
   done
   ```

4. **Observe the redis-cli monitor output:**
   - Should see `GET url:aBcDeF` (fast cache hits)
   - Should see `INCR clicks:aBcDeF` (click increments)

### Expected Results

- ✅ First request might query PostgreSQL
- ✅ Subsequent requests use Redis cache
- ✅ Click counter increments in Redis

---

## Test 3: Rate Limiting

### Purpose
Verify that rate limiting blocks excessive requests.

### Steps

1. **Make 35 requests to /shorten endpoint:**
   ```bash
   for i in {1..35}; do
     echo "Request $i:"
     curl -X POST http://localhost:3000/shorten \
       -H "Content-Type: application/json" \
       -d "{\"longUrl\": \"https://example.com/test$i\"}" \
       -w "\nStatus: %{http_code}\n"
     echo ""
     sleep 0.1
   done
   ```

2. **Observe the response codes:**
   - Requests 1-30: HTTP 201 (Created)
   - Requests 31-35: HTTP 429 (Too Many Requests)

### Expected Results

- ✅ First 30 requests succeed
- ✅ Requests 31+ return HTTP 429
- ✅ Error message: "Too many short URLs created from this IP"

---

## Test 4: Rate Limit Reset

### Purpose
Verify that rate limit resets after the time window.

### Steps

1. **Hit rate limit** (from Test 3)

2. **Wait for reset:**
   - Rate limit window is 15 minutes
   - For testing, you can check the `RateLimit-Reset` header

3. **Create another short URL after waiting:**
   ```bash
   # After 15 minutes or reset time
   curl -X POST http://localhost:3000/shorten \
     -H "Content-Type: application/json" \
     -d '{"longUrl": "https://example.com/after-reset"}'
   ```

### Expected Results

- ✅ After reset time, request succeeds again
- ✅ Rate limit counter resets to 0

---

## Test 5: Statistics with Caching

### Purpose
Verify that analytics show correct click counts (from DB + cache).

### Steps

1. **Create a short URL:**
   ```bash
   curl -X POST http://localhost:3000/shorten \
     -H "Content-Type: application/json" \
     -d '{"longUrl": "https://example.com"}'
   ```
   Copy the `shortCode`

2. **Make several redirect requests:**
   ```bash
   for i in {1..5}; do
     curl -L http://localhost:3000/aBcDeF >/dev/null 2>&1
     sleep 0.1
   done
   ```

3. **Get statistics:**
   ```bash
   curl http://localhost:3000/stats/aBcDeF
   ```

4. **Verify click count:**
   - Should show: `"clicks": 5` or higher

### Expected Results

- ✅ Click count reflects redirects (from both DB and cache)
- ✅ Stats endpoint returns correct data
- ✅ Clicks increase with each redirect

---

## Test 6: Cache Invalidation/Expiration

### Purpose
Verify that cached data expires after 24 hours.

### Steps

1. **Create a short URL and verify it's cached**

2. **Check TTL in Redis:**
   ```bash
   redis-cli ttl url:aBcDeF
   # Should return a number (seconds until expiration)
   # For example: 86398 (close to 24 hours)
   ```

3. **Manually expire cache entry (for testing):**
   ```bash
   redis-cli expire url:aBcDeF 10
   # Now expires in 10 seconds
   ```

4. **Wait 11 seconds and check:**
   ```bash
   sleep 11
   redis-cli get url:aBcDeF
   # Should return nil (expired)
   ```

5. **Make a redirect request:**
   ```bash
   curl -L http://localhost:3000/aBcDeF
   # Should still work (queries PostgreSQL, recaches)
   ```

### Expected Results

- ✅ Cache entries have 24-hour TTL
- ✅ Expired entries are automatically removed
- ✅ System falls back to PostgreSQL for expired entries
- ✅ Expired entries are re-cached

---

## Test 7: Graceful Degradation (Redis Down)

### Purpose
Verify that the system works if Redis is unavailable.

### Steps

1. **Stop Redis:**
   ```bash
   brew services stop redis
   ```

2. **Try to create a short URL:**
   ```bash
   curl -X POST http://localhost:3000/shorten \
     -H "Content-Type: application/json" \
     -d '{"longUrl": "https://example.com"}'
   ```
   Should still work! ✅

3. **Try to redirect:**
   ```bash
   curl -L http://localhost:3000/aBcDeF
   ```
   Should still work! ✅

4. **Check server logs:**
   - Should show: `⚠️ Redis connection error` or similar
   - Should show: `⚠️ Redis not available, caching disabled`

5. **Restart Redis:**
   ```bash
   brew services start redis
   redis-cli ping  # Should return PONG
   ```

### Expected Results

- ✅ All endpoints work without Redis
- ✅ No errors, just warnings in logs
- ✅ Caching is skipped gracefully
- ✅ Database queries work normally

---

## Test 8: Welcome Endpoint Status

### Purpose
Verify that the welcome endpoint shows correct cache status.

### Steps

1. **With Redis running:**
   ```bash
   curl http://localhost:3000
   ```
   Should show: `"cacheStatus": "✅ Redis connected"`

2. **Stop Redis:**
   ```bash
   brew services stop redis
   ```

3. **Check again:**
   ```bash
   curl http://localhost:3000
   ```
   Should show: `"cacheStatus": "⚠️ Redis unavailable (non-critical)"`

4. **Restart Redis:**
   ```bash
   brew services start redis
   ```

### Expected Results

- ✅ Endpoint shows accurate Redis connection status
- ✅ Status updates correctly when Redis stops/starts

---

## Summary Table

| Test | Status | Notes |
| ---- | ------ | ----- |
| Redis Caching | ✅ | URLs cached, clicks tracked |
| Cache Hit Performance | ✅ | Subsequent requests use cache |
| Rate Limiting | ✅ | 30 requests per 15 minutes limit |
| Rate Limit Reset | ✅ | Resets after time window |
| Statistics with Cache | ✅ | Accurate click counts |
| Cache Expiration | ✅ | 24-hour TTL working |
| Graceful Degradation | ✅ | Works without Redis |
| Welcome Endpoint | ✅ | Shows correct status |

---

## Cleanup Commands

**Clear all cache:**
```bash
redis-cli FLUSHALL
```

**Stop Redis:**
```bash
brew services stop redis
```

**Restart Redis:**
```bash
brew services start redis
```

**Monitor Redis in real-time:**
```bash
redis-cli monitor
```
