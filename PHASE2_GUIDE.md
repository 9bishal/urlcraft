# Phase 2: Database Integration Guide

A complete guide to understanding and using PostgreSQL with URLCraft.

---

## Overview

**Phase 1** used memory (Map) - data was lost on restart.  
**Phase 2** uses PostgreSQL database - data is permanent! ✅

---

## What We Built

### 1. Database Table

```sql
CREATE TABLE urls (
  id SERIAL PRIMARY KEY,
  short_code VARCHAR(10) UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Visualized:**

```
Table: urls

┌────┬────────────┬─────────────────────────┬──────────────────────┐
│ id │ short_code │  original_url           │    created_at        │
├────┼────────────┼─────────────────────────┼──────────────────────┤
│ 1  │ xY7bK2     │ https://github.com      │ 2026-04-05 10:30:00  │
│ 2  │ aB9cD1     │ https://example.com     │ 2026-04-05 10:31:00  │
│ 3  │ mN2pQ5     │ https://google.com      │ 2026-04-05 10:32:00  │
└────┴────────────┴─────────────────────────┴──────────────────────┘
```

### 2. Column Explanations

| Column | Type | Purpose |
|--------|------|---------|
| `id` | SERIAL PRIMARY KEY | Auto-increment (1, 2, 3...) - unique ID for each row |
| `short_code` | VARCHAR(10) UNIQUE NOT NULL | The 6-character code (e.g., "xY7bK2") - must be unique |
| `original_url` | TEXT NOT NULL | The full URL you want to shorten |
| `created_at` | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | Auto-set to current date/time |

---

## Code Changes Explained

### Before (Phase 1 - Memory)

```javascript
// In-memory Map
const urlMap = new Map();

// Create: Just add to map
urlMap.set(shortCode, longUrl);

// Retrieve: Just get from map
const originalUrl = urlMap.get(shortCode);

// Problem: Data lost on restart! ❌
```

### After (Phase 2 - Database)

```javascript
// PostgreSQL connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'urlcraft_db',
  user: 'bishalkumarshah',
  password: '',
});

// Create: Insert into database
await pool.query(
  'INSERT INTO urls (short_code, original_url) VALUES ($1, $2)',
  [shortCode, longUrl]
);

// Retrieve: Query the database
const result = await pool.query(
  'SELECT original_url FROM urls WHERE short_code = $1',
  [shortCode]
);
const originalUrl = result.rows[0].original_url;

// Benefit: Data persists! ✅
```

---

## Understanding SQL Queries

### What is SQL?

SQL (Structured Query Language) is the language used to talk to databases. It's like asking questions:

```
English: "Give me the original URL for short code xY7bK2"
SQL:     SELECT original_url FROM urls WHERE short_code = 'xY7bK2'
```

### Query 1: INSERT (Create)

```javascript
pool.query(
  'INSERT INTO urls (short_code, original_url) VALUES ($1, $2)',
  [shortCode, longUrl]
);
```

**Meaning:** Add a new row to the table

```
INSERT INTO urls           ← Add to this table
(short_code, original_url) ← These columns
VALUES ($1, $2)            ← With these values
[shortCode, longUrl]       ← The actual values
```

**Example:**

```javascript
pool.query(
  'INSERT INTO urls (short_code, original_url) VALUES ($1, $2)',
  ['xY7bK2', 'https://github.com']
);

// Result: New row added
// 1 | xY7bK2 | https://github.com | 2026-04-05 10:30:00
```

### Query 2: SELECT (Read)

```javascript
const result = await pool.query(
  'SELECT original_url FROM urls WHERE short_code = $1',
  [shortCode]
);
```

**Meaning:** Get the original URL where short code matches

```
SELECT original_url     ← Get this column
FROM urls               ← From this table
WHERE short_code = $1   ← Where this condition is true
[shortCode]             ← The value to match
```

**Example:**

```javascript
const result = await pool.query(
  'SELECT original_url FROM urls WHERE short_code = $1',
  ['xY7bK2']
);

// Result: { rows: [{ original_url: 'https://github.com' }] }
const originalUrl = result.rows[0].original_url;
// originalUrl = 'https://github.com'
```

---

## async/await Explained

PostgreSQL queries take time (accessing disk). We use `async/await` to wait for the result:

```javascript
// OLD WAY (Phase 1 - instant)
const originalUrl = urlMap.get(shortCode); // Immediate
res.json({ originalUrl });                 // Send immediately

// NEW WAY (Phase 2 - takes time)
const result = await pool.query(...);      // Wait for database
const originalUrl = result.rows[0].original_url; // Then use result
res.json({ originalUrl });                 // Then send
```

**Key Points:**

- `async` = "This function might wait for something"
- `await` = "Wait here for the database to respond"
- Without `await`, code runs before database responds (bug!)

```javascript
// ❌ WRONG (no await)
app.post('/shorten', (req, res) => {
  const result = pool.query(...);     // Doesn't wait!
  const url = result.rows[0];         // Undefined!
});

// ✅ CORRECT (with await)
app.post('/shorten', async (req, res) => {
  const result = await pool.query(...); // Waits for response
  const url = result.rows[0];           // Has data!
});
```

---

## Testing Phase 2

### Test 1: Create a Short URL

**In Postman:**

```
POST http://localhost:3000/shorten

Body (JSON):
{
  "longUrl": "https://github.com"
}

Expected Response:
{
  "shortCode": "xY7bK2",
  "shortUrl": "http://localhost:3000/xY7bK2",
  "originalUrl": "https://github.com"
}
Status: 201 Created
```

**What Happens Behind the Scenes:**

```
1. Generate random code: "xY7bK2"
2. Run SQL: INSERT INTO urls (short_code, original_url) 
             VALUES ('xY7bK2', 'https://github.com')
3. Database saves the row
4. Return response to user
```

### Test 2: Redirect to Original URL

**In Postman:**

```
GET http://localhost:3000/xY7bK2

Expected Response:
Status: 301 Moved Permanently
Location: https://github.com
```

**What Happens Behind the Scenes:**

```
1. Get short code from URL: "xY7bK2"
2. Run SQL: SELECT original_url FROM urls 
            WHERE short_code = 'xY7bK2'
3. Database returns: "https://github.com"
4. Redirect to that URL
```

### Test 3: Verify Data Persists

**Restart the server:**

```bash
# Press Ctrl+C to stop
# Then restart:
npm run dev
```

**In Postman, test the same short code:**

```
GET http://localhost:3000/xY7bK2

Expected: Still redirects to https://github.com ✅
(In Phase 1, this would have failed because data was lost!)
```

### Test 4: View Data in Database

**In terminal:**

```bash
psql -U bishalkumarshah urlcraft_db
```

**Then in PostgreSQL:**

```sql
SELECT * FROM urls;
```

**Output:**

```
 id | short_code |     original_url      |         created_at
----+------------+-----------------------+----------------------------
  1 | xY7bK2     | https://github.com    | 2026-04-05 10:30:00.123456
  2 | aB9cD1     | https://example.com   | 2026-04-05 10:31:00.456789
(2 rows)
```

---

## Differences: Phase 1 vs Phase 2

| Feature | Phase 1 (Memory) | Phase 2 (Database) |
|---------|------------------|-------------------|
| **Storage** | RAM | Hard Drive |
| **Data Persistence** | Lost on restart ❌ | Saved forever ✅ |
| **Speed** | Super fast ⚡ | Slightly slower (but worth it) |
| **Scalability** | Max ~1M URLs | Millions+ URLs |
| **Query Time** | Instant | ~1-10ms |
| **Best For** | Testing | Production |

---

## Error Handling

### Connection Errors

If you get: `ECONNREFUSED`

```
PostgreSQL is not running!
```

**Fix:**

```bash
brew services start postgresql@15
```

### Database Errors

If you get: `database "urlcraft_db" does not exist`

```
Database wasn't created.
```

**Fix:**

```bash
psql -U bishalkumarshah postgres -c "CREATE DATABASE urlcraft_db;"
```

### Query Errors

If you get: `relation "urls" does not exist`

```
Table wasn't created.
```

**Fix:**

```bash
psql -U bishalkumarshah urlcraft_db << EOF
CREATE TABLE urls (
  id SERIAL PRIMARY KEY,
  short_code VARCHAR(10) UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF
```

---

## Key Concepts Learned

1. **Databases store data permanently** (unlike memory)
2. **SQL is used to interact with databases** (INSERT, SELECT, etc.)
3. **async/await waits for database responses** (queries take time)
4. **$1, $2 are placeholders** (prevent SQL injection)
5. **Pooling manages database connections** (reuses connections)

---

## Next Steps (Phase 3)

- ✅ Basic database integration
- ✅ Persistent storage
- 🔜 Better error handling
- 🔜 Unique code generation (check if exists before insert)
- 🔜 Input validation (validate URL format)
- 🔜 Database indexes (speed up lookups)

---

## Quick Command Reference

```bash
# Start PostgreSQL
brew services start postgresql@15

# Connect to database
psql -U bishalkumarshah urlcraft_db

# View all data
SELECT * FROM urls;

# View specific short code
SELECT * FROM urls WHERE short_code = 'xY7bK2';

# Delete a short code
DELETE FROM urls WHERE short_code = 'xY7bK2';

# Exit PostgreSQL
\q
```

---

## Summary

**Phase 2 Achievement:** ✅

- Replaced in-memory Map with PostgreSQL database
- Data now persists across server restarts
- Using async/await for database queries
- Tested with Postman
- Ready for production-grade storage

**You now have a production-ready URL shortener with persistent storage!** 🎉

---

## Questions?

Review:
1. **How data flows** from POST request → Database → Persistent storage
2. **SQL basics** - INSERT creates rows, SELECT retrieves rows
3. **async/await** - Don't skip the await or data won't load!
4. **Testing** - Always verify data persists after restart

Next, we'll add **Phase 3: Error Handling & Validation** 🚀
