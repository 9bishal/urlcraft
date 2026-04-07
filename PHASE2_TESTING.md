# Phase 2 Testing Checklist

Quick reference for testing Phase 2 (Database Integration).

---

## ✅ Setup Complete

- [x] PostgreSQL installed and running
- [x] Database `urlcraft_db` created
- [x] Table `urls` created
- [x] `pg` package installed (`npm install pg`)
- [x] Code updated to use PostgreSQL
- [x] Server running (`npm run dev`)

---

## 🚀 Test Steps

### Step 1: Create First Short URL

**In Postman:**

```
Method: POST
URL: http://localhost:3000/shorten
Body (JSON):
{
  "longUrl": "https://github.com"
}
```

**Expected:**

```json
{
  "shortCode": "xY7bK2",
  "shortUrl": "http://localhost:3000/xY7bK2",
  "originalUrl": "https://github.com"
}
Status: 201 Created
```

**✅ Success?** Copy the `shortCode` for next step.

---

### Step 2: Redirect to Original URL

**In Postman:**

```
Method: GET
URL: http://localhost:3000/xY7bK2  (use YOUR shortCode)
```

**Expected:**

```
Status: 301 Moved Permanently
Location: https://github.com
```

**✅ Success?** Continue to Step 3.

---

### Step 3: Create Second Short URL (Different URL)

**In Postman:**

```
Method: POST
URL: http://localhost:3000/shorten
Body (JSON):
{
  "longUrl": "https://google.com"
}
```

**Expected:** New shortCode and response.

**✅ Success?** Note the new shortCode.

---

### Step 4: Verify Data in Database

**In Terminal:**

```bash
psql -U bishalkumarshah urlcraft_db -c "SELECT * FROM urls;"
```

**Expected Output:**

```
 id | short_code |    original_url     |         created_at
----+------------+---------------------+----------------------------
  1 | xY7bK2     | https://github.com  | 2026-04-05 10:30:00.123456
  2 | aB9cD1     | https://google.com  | 2026-04-05 10:31:00.456789
(2 rows)
```

**✅ Both URLs in database?** Continue to Step 5.

---

### Step 5: Restart Server & Test Persistence

**In Terminal:**

```bash
# Press Ctrl+C to stop the server
# Then restart:
npm run dev
```

**In Postman:**

```
Method: GET
URL: http://localhost:3000/xY7bK2  (first short code)
```

**Expected:**

```
Status: 301 Moved Permanently
Location: https://github.com
```

**✅ Redirect still works after restart?** Data is persisted! 🎉

---

### Step 6: Test Error Handling

**In Postman:**

```
Method: POST
URL: http://localhost:3000/shorten
Body (JSON):
{}
```

**Expected:**

```json
{
  "error": "longUrl is required"
}
Status: 400 Bad Request
```

**✅ Error handling works?** Continue.

---

### Step 7: Test Non-existent Short Code

**In Postman:**

```
Method: GET
URL: http://localhost:3000/invalidXYZ
```

**Expected:**

```json
{
  "error": "Short URL not found"
}
Status: 404 Not Found
```

**✅ 404 error works?** All tests pass! 🎉

---

## ✅ Phase 2 Complete!

| Test | Status |
|------|--------|
| Create short URL | ✅ |
| Redirect works | ✅ |
| Data persists | ✅ |
| Error handling | ✅ |
| Database integration | ✅ |

---

## Summary: What Changed

### Phase 1 (Memory)
```javascript
const urlMap = new Map();
urlMap.set(shortCode, longUrl);
const url = urlMap.get(shortCode);
// Data lost on restart ❌
```

### Phase 2 (Database)
```javascript
const pool = new Pool({ ... });
await pool.query('INSERT INTO urls...', [shortCode, longUrl]);
const result = await pool.query('SELECT original_url...', [shortCode]);
// Data persists forever ✅
```

---

## Key Differences

| Aspect | Phase 1 | Phase 2 |
| --- | --- | --- |
| Storage | RAM (Memory) | Disk (PostgreSQL) |
| Persistence | Lost on restart | Saved forever |
| Data Format | JavaScript Map | SQL Database |
| Querying | `.get()` method | SQL queries |
| Async | Synchronous | Asynchronous (async/await) |

---

## Next Phase

**Phase 3: Improvements**

- Better error handling
- Input validation (check if URL is valid)
- Unique code generation (check if exists before insert)
- Rate limiting
- Analytics (click tracking)

---

## Troubleshooting

### Server won't start

**Error:** `ECONNREFUSED`

**Fix:**

```bash
brew services start postgresql@15
```

### Database queries fail

**Error:** `relation "urls" does not exist`

**Fix:** Verify table exists

```bash
psql -U bishalkumarshah urlcraft_db -c "\dt"
```

### Connection errors

**Check connection string:**

```javascript
const pool = new Pool({
  host: 'localhost',      // ✅ localhost
  port: 5432,             // ✅ 5432
  database: 'urlcraft_db', // ✅ correct database name
  user: 'bishalkumarshah', // ✅ your username
  password: '',           // ✅ empty for local dev
});
```

---

## Files Updated

- `src/index.js` - Added PostgreSQL connection and database queries
- `package.json` - Added `pg` dependency
- Database - Created `urls` table in `urlcraft_db`

---

## Now You Can...

✅ Create short URLs that are saved permanently  
✅ Redirect to original URLs from database  
✅ Verify data in PostgreSQL  
✅ Restart server without losing data  
✅ Scale to thousands of URLs  

**You're ready for Phase 3!** 🚀
