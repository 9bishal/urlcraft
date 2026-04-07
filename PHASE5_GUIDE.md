# Phase 5: Custom Short Codes

## What's New

Users can now choose their own short codes instead of random ones!

```bash
# Auto-generated (existing)
POST /shorten { "longUrl": "https://example.com" }
→ "shortCode": "aBc123"

# Custom code (NEW!)
POST /shorten { 
  "longUrl": "https://example.com",
  "customCode": "my-awesome-link"
}
→ "shortCode": "my-awesome-link"
```

---

## Custom Code Rules

- **Length**: 3-30 characters
- **Characters**: Alphanumeric, dashes, underscores only
- **Unique**: Must not already exist
- **Examples**:
  - ✅ `my-link`
  - ✅ `awesome_url`
  - ✅ `link123`
  - ❌ `ab` (too short)
  - ❌ `my@link` (special char)
  - ❌ `my-link` (already taken)

---

## API Examples

### Create with Auto-Generated Code

```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl": "https://github.com"}'
```

**Response:**
```json
{
  "shortCode": "Xnb92M",
  "shortUrl": "http://localhost:3000/Xnb92M",
  "originalUrl": "https://github.com",
  "isCustom": false
}
```

### Create with Custom Code

```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl": "https://twitter.com", "customCode": "my-tweet"}'
```

**Response:**
```json
{
  "shortCode": "my-tweet",
  "shortUrl": "http://localhost:3000/my-tweet",
  "originalUrl": "https://twitter.com",
  "isCustom": true
}
```

### Custom Code Already Taken

```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl": "https://facebook.com", "customCode": "my-tweet"}'
```

**Response (409 Conflict):**
```json
{
  "error": "This code is already taken"
}
```

### Invalid Custom Code Format

```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl": "https://example.com", "customCode": "ab"}'
```

**Response (400 Bad Request):**
```json
{
  "error": "Invalid code format (3-30 chars, alphanumeric, dash, underscore)"
}
```

---

## Stats Endpoint

Now shows whether code is custom or auto-generated:

```bash
curl http://localhost:3000/stats/my-tweet
```

**Response:**
```json
{
  "shortCode": "my-tweet",
  "shortUrl": "http://localhost:3000/my-tweet",
  "originalUrl": "https://twitter.com",
  "clicks": 5,
  "isCustom": true,
  "createdAt": "2026-04-05T08:57:06.353Z"
}
```

---

## Database Changes

### New Column

```sql
ALTER TABLE urls ADD COLUMN is_custom BOOLEAN DEFAULT FALSE;
```

### Column Size Increase

```sql
ALTER TABLE urls ALTER COLUMN short_code TYPE VARCHAR(30);
```

This supports codes up to 30 characters (previously 6-char limit).

---

## Testing

### Test 1: Auto-generated Code
```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl": "https://example.com"}'
```
Expected: Random 6-char code, `isCustom: false`

### Test 2: Valid Custom Code
```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl": "https://example.com", "customCode": "my-link"}'
```
Expected: `shortCode: "my-link"`, `isCustom: true`

### Test 3: Duplicate Custom Code
```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl": "https://example.com", "customCode": "my-link"}'
```
Expected: HTTP 409, error message

### Test 4: Invalid Format (too short)
```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl": "https://example.com", "customCode": "ab"}'
```
Expected: HTTP 400, format error

### Test 5: Invalid Format (special chars)
```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl": "https://example.com", "customCode": "my@link"}'
```
Expected: HTTP 400, format error

### Test 6: Redirect with Custom Code
```bash
curl -L http://localhost:3000/my-link
```
Expected: Redirects to original URL, increments clicks

### Test 7: Stats with Custom Code
```bash
curl http://localhost:3000/stats/my-link
```
Expected: Shows `isCustom: true`

---

## Code Improvements

### Before (Phase 4)
- Only auto-generated 6-char codes
- One helper function for unique code generation
- ~200 lines of comments

### After (Phase 5)
- Support both auto-generated and custom codes
- Clean validation for custom codes
- Multiple smaller helper functions
- ~270 total lines (more features, cleaner code!)

---

## What's Stored in Database

```sql
SELECT short_code, is_custom, original_url, clicks FROM urls;
```

**Example:**
```
  short_code   | is_custom |    original_url     | clicks
──────────────┼───────────┼─────────────────────┼────────
 Xnb92M       | false     | https://github.com  |      2
 my-tweet     | true      | https://twitter.com |      5
 awesome_link | true      | https://example.com |      0
```

---

## Summary

✅ Users can choose custom codes  
✅ Validation ensures quality codes  
✅ Code dedupe with clear errors  
✅ Cleaner, simpler code structure  
✅ Full backward compatibility (auto-codes still work)  
✅ Stats show which codes are custom  

**Phase 5 Complete!** 🚀
