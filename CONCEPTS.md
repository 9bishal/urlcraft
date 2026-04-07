# URLCraft - Frequently Asked Questions & Learning Guide

## Table of Contents
1. [Data Structure & Storage](#data-structure--storage)
2. [Error Handling](#error-handling)
3. [HTTP & Redirects](#http--redirects)
4. [General Concepts](#general-concepts)

---

## Data Structure & Storage

### Q1: Why do we use a Map for storage instead of an Array or Object?

#### The Question
Why is a JavaScript `Map` better than alternatives like arrays `[]` or plain objects `{}`?

#### The Answer

**Maps have O(1) lookup time** - This means finding a URL by its short code is super fast, no matter how many URLs you have stored.

**Comparison:**

| Storage Type | Lookup Speed | Insert Speed | Use Case |
|---|---|---|---|
| **Map** | O(1) - Very Fast ✅ | O(1) - Very Fast ✅ | **Best for key-value lookups** |
| **Array** | O(n) - Slow | O(1) - Fast | Best for ordered data |
| **Object** | O(1) - Fast | O(1) - Fast | Similar to Map, but less flexible |

#### Why Map is Better Than Object

```javascript
// OBJECT approach (less ideal for our use case)
const urlObject = {};
urlObject['abc123'] = 'https://example.com';
urlObject['xyz789'] = 'https://github.com';

// Problem: Objects have hidden properties like __proto__
// Can cause issues with certain short codes

// MAP approach (what we use) ✅
const urlMap = new Map();
urlMap.set('abc123', 'https://example.com');
urlMap.set('xyz789', 'https://github.com');

// Benefits:
// - No prototype pollution issues
// - Only stores what you add
// - Clearer intent (key-value store)
```

#### Real-World Performance Impact

Imagine you have 1 million short URLs:

- **With Map:** Finding one takes ~1 operation (instant)
- **With Array:** Finding one takes ~500,000 operations (very slow)

```javascript
// Array lookup - SLOW ❌
const urlArray = [...];
const found = urlArray.find(item => item.code === 'abc123'); // loops through all!

// Map lookup - FAST ✅
const urlMap = new Map();
const found = urlMap.get('abc123'); // direct lookup!
```

#### Code Example

```javascript
// Creating a Map
const urlMap = new Map();

// Adding entries
urlMap.set('abc123', 'https://example.com');
urlMap.set('xyz789', 'https://github.com');

// Looking up (what happens on redirect)
const originalUrl = urlMap.get('abc123'); // Returns instantly!

// Checking if key exists
if (urlMap.has('abc123')) { ... }

// Getting all entries
for (const [code, url] of urlMap.entries()) {
  console.log(code, url);
}
```

---

### Q2: What happens if two short codes collide?

#### The Question
What if `generateShortCode()` creates the same 6-character code twice?

#### The Problem Scenario

```javascript
// First request
generateShortCode() → "abc123"
urlMap.set("abc123", "https://example.com")

// Second request (bad luck!)
generateShortCode() → "abc123" (same code!)
urlMap.set("abc123", "https://github.com") // OVERWRITES!

// Now when someone visits /abc123, they get GitHub instead of Example!
```

#### Why This Is Bad

- **Data Loss:** The first URL is lost and unrecoverable
- **User Confusion:** Someone shared the first URL, but now it goes somewhere else
- **Trust Issues:** Your service looks broken

#### Current Implementation (Phase 1)

```javascript
// src/index.js - lines 57-58
const shortCode = generateShortCode();
urlMap.set(shortCode, longUrl);
```

**This is a known limitation!** We don't check if the code already exists.

#### How to Fix It (Phase 3)

We need to:
1. Check if the short code already exists
2. If it does, generate a new one
3. Keep trying until we find an unused code

```javascript
// BETTER approach (Phase 3)
function generateUniqueShortCode() {
  let shortCode;
  do {
    shortCode = generateShortCode();
  } while (urlMap.has(shortCode)); // Keep generating until unique!
  return shortCode;
}

// Then use it:
const shortCode = generateUniqueShortCode(); // Guaranteed unique ✅
```

#### Even Better Solution (Phase 4)

Use a UUID library or counter-based system:

```javascript
// Sequential counter (predictable but guaranteed unique)
let counter = 1;
function generateShortCode() {
  return counter++; // 1, 2, 3, ...
}

// Or use a library like shortid:
const shortid = require('shortid');
const code = shortid.generate(); // Generates unique IDs automatically
```

#### Probability in Phase 1

With 62 characters (A-Z, a-z, 0-9) and 6-character codes:
- Total possible codes: 62^6 = **56.8 billion combinations**
- Your server would need to serve millions of URLs before collision risk is real
- **In Phase 1 (testing), collisions are extremely unlikely**

#### Summary

| Phase | Solution | Collision Risk |
|-------|----------|---|
| **Phase 1 (current)** | Just generate randomly | ~0% (for testing) |
| **Phase 3** | Check if exists, regenerate if needed | 0% ✅ |
| **Phase 4** | Use UUID or counter | 0% ✅ |

---

## Error Handling

### Q3: What happens if someone calls /shorten without a longUrl?

#### The Question
Where in the code do we validate the input? What response does the user get?

#### The Code

```javascript
app.post('/shorten', (req, res) => {
  const { longUrl } = req.body;

  // ⭐ THIS IS ERROR HANDLING (lines 55-58)
  if (!longUrl) {
    return res.status(400).json({
      error: 'longUrl is required'
    });
  }

  // ... rest of code only runs if validation passes
});
```

#### Step-by-Step Explanation

**Step 1: Extract the input**
```javascript
const { longUrl } = req.body;
```
- Pulls `longUrl` from the JSON body user sent
- If not provided, `longUrl` becomes `undefined`

**Step 2: Validate it**
```javascript
if (!longUrl) {
  // longUrl is either undefined, null, empty string, etc.
  return res.status(400).json({ error: '...' });
}
```

**Step 3: Return error if invalid**
- `status(400)` = "Bad Request" (your fault, not server's)
- Sends JSON response with error message
- `return` stops execution (rest of code doesn't run)

**Step 4: Continue if valid**
```javascript
// This only runs if longUrl is NOT empty
const shortCode = generateShortCode();
urlMap.set(shortCode, longUrl);
res.status(201).json({ ... });
```

#### What User Gets

**Invalid Request (missing longUrl):**
```javascript
// In Postman, send POST /shorten with body:
{}  // empty body

// Response:
{
  "error": "longUrl is required"
}
// Status: 400 Bad Request ❌
```

**Valid Request:**
```javascript
// In Postman, send POST /shorten with body:
{
  "longUrl": "https://example.com"
}

// Response: 
{
  "shortCode": "abc123",
  "shortUrl": "http://localhost:3000/abc123",
  "originalUrl": "https://example.com"
}
// Status: 201 Created ✅
```

#### HTTP Status Codes Explained

| Code | Name | Meaning |
|------|------|---------|
| **201** | Created | Success! New resource created |
| **400** | Bad Request | Client's fault (missing data, invalid input) |
| **404** | Not Found | Resource doesn't exist |
| **500** | Server Error | Server's fault (bug, crash) |

#### Current Validation (Phase 1)

```javascript
if (!longUrl) {
  return res.status(400).json({ error: 'longUrl is required' });
}
```

This handles:
- ✅ Missing field: `{}`
- ✅ Empty string: `{ "longUrl": "" }`
- ✅ Null: `{ "longUrl": null }`
- ✅ Undefined: `{ }`

This does NOT handle (Phase 3 improvement):
- ❌ Invalid URL format: `{ "longUrl": "not-a-url" }`
- ❌ URL too long: `{ "longUrl": "very-very-very-very-...-long-url" }`
- ❌ Protocol missing: `{ "longUrl": "example.com" }`

#### Future Improvements (Phase 3)

```javascript
function isValidUrl(url) {
  try {
    new URL(url); // JavaScript's built-in URL validator
    return true;
  } catch {
    return false;
  }
}

app.post('/shorten', (req, res) => {
  const { longUrl } = req.body;

  // Better validation
  if (!longUrl) {
    return res.status(400).json({ error: 'longUrl is required' });
  }

  if (!isValidUrl(longUrl)) {
    return res.status(400).json({ error: 'longUrl must be a valid URL' });
  }

  if (longUrl.length > 2000) {
    return res.status(400).json({ error: 'longUrl is too long' });
  }

  // ... rest of code
});
```

---

## HTTP & Redirects

### Q4: Does redirect happen automatically in a browser? What does Postman show?

#### The Question
When you GET a short code and receive a 301 redirect, what's the difference between a browser and Postman?

#### The Answer

**In a Browser:** Automatic ✅  
**In Postman:** Shows the redirect response ⚠️

#### Detailed Comparison

### Browser Behavior

```
1. User types: http://localhost:3000/abc123
2. Browser sends: GET /abc123
3. Server responds: 301 Moved Permanently
   Location: https://example.com
4. Browser AUTOMATICALLY follows the redirect
5. Browser shows: https://example.com (user sees final page)
```

**User Experience:**
```
🔗 Click /abc123 → Page loads → See example.com content
(The redirect is invisible!)
```

### Postman Behavior

By default, Postman shows you the **redirect response**, not the final destination.

```
1. You type: GET http://localhost:3000/abc123
2. Postman sends: GET /abc123
3. Server responds: 301 Moved Permanently
   Location: https://example.com
4. Postman STOPS and shows you this response ⚠️
5. You see: The 301 response (not the final page)
```

**What Postman Shows:**

```
Status: 301 Moved Permanently

Headers tab:
Location: https://example.com

Body: (empty or redirect info)
```

#### Visualizing the Difference

```
┌─ Browser ─────────────────────────────┐
│ 1. GET /abc123                        │
│ 2. ← 301 Redirect                     │
│ 3. Automatically follow               │
│ 4. GET https://example.com            │
│ 5. ← 200 OK (example.com content)     │
│ 6. Show user: example.com content ✅  │
└───────────────────────────────────────┘

┌─ Postman (Default) ───────────────────┐
│ 1. GET /abc123                        │
│ 2. ← 301 Redirect                     │
│ 3. STOP! Show redirect response 🛑    │
│ 4. User sees: 301 status code         │
└───────────────────────────────────────┘
```

#### Testing in Postman: Two Ways

**Option 1: Let Postman Follow Redirects** ✅ (Recommended for testing)

1. Send GET request to `http://localhost:3000/abc123`
2. Look for "Follow redirects" option (usually auto-enabled)
3. Postman will show you the final response

**Option 2: See the Redirect Response** (Default)

1. Send GET request
2. You'll see:
   - Status: `301`
   - Headers: `Location: https://example.com`
   - Body: empty

#### Code in Our Server

```javascript
app.get('/:shortCode', (req, res) => {
  const { shortCode } = req.params;
  const originalUrl = urlMap.get(shortCode);

  if (!originalUrl) {
    return res.status(404).json({ error: 'Short URL not found' });
  }

  // ⭐ THIS CREATES THE REDIRECT (line 94)
  res.redirect(301, originalUrl);
  // 301 = "Moved Permanently"
  // Browser will follow this automatically
});
```

#### Why 301 vs Other Codes?

```javascript
res.redirect(301, originalUrl);  // Moved Permanently (cache it!)
res.redirect(302, originalUrl);  // Found (temporary redirect)
res.redirect(307, originalUrl);  // Temporary Redirect
```

| Code | Name | Use Case |
|------|------|----------|
| **301** | Moved Permanently | URL shortener (the short code is permanent) ✅ |
| **302** | Found | Temporary redirect |
| **307** | Temporary Redirect | Temporary, preserve HTTP method |

#### Testing Steps in Postman

**Step 1: Create a short URL**
```
POST http://localhost:3000/shorten
Body: { "longUrl": "https://github.com" }

Response:
{
  "shortCode": "xY7bK2",
  "shortUrl": "http://localhost:3000/xY7bK2",
  ...
}
```

**Step 2: Test the redirect**
```
GET http://localhost:3000/xY7bK2

You'll see:
Status: 301 Moved Permanently
Headers: Location: https://github.com

(Postman may auto-follow and show you GitHub's page)
```

**Step 3: In a real browser**
```
1. Open: http://localhost:3000/xY7bK2
2. Page automatically loads GitHub
3. URL bar changes to: https://github.com
```

#### Summary Table

| Feature | Browser | Postman (Default) | Postman (Follow Redirects) |
|---------|---------|---|---|
| Automatic follow | ✅ Yes | ❌ No | ✅ Yes |
| Shows redirect response | ❌ Hidden | ✅ Yes | ❌ Hidden |
| Shows final page | ✅ Yes | ❌ No | ✅ Yes |
| Good for testing redirects | ⚠️ Can't see 301 | ✅ Perfect | ✅ Good |

---

## General Concepts

### HTTP Methods Quick Reference

```javascript
GET     - Retrieve data (no body)
         Example: GET /user/123
         Use case: Fetch information

POST    - Create new data (with body)
         Example: POST /users with { name: "John" }
         Use case: Create something

PUT     - Replace existing data (with body)
         Example: PUT /user/123 with { name: "Jane" }
         Use case: Update everything

PATCH   - Update part of data (with body)
         Example: PATCH /user/123 with { email: "new@example.com" }
         Use case: Update something

DELETE  - Remove data (no body)
         Example: DELETE /user/123
         Use case: Delete something
```

### Request vs Response

```javascript
// REQUEST (Client → Server)
GET /abc123 HTTP/1.1
Host: localhost:3000
Headers: { ... }
Body: (none for GET)

// RESPONSE (Server → Client)
HTTP/1.1 301 Moved Permanently
Location: https://example.com
Headers: { ... }
Body: (redirect info or content)
```

### JSON Format

```javascript
// Valid JSON (what we use)
{
  "shortCode": "abc123",
  "originalUrl": "https://example.com"
}

// JavaScript object (NOT JSON, missing quotes)
{
  shortCode: "abc123",
  originalUrl: "https://example.com"
}
```

---

## Key Takeaways

1. **Map Storage:** Fast O(1) lookups, perfect for key-value pairs
2. **Collision Handling:** Phase 1 doesn't check, Phase 3 will
3. **Validation:** Check input before processing
4. **Redirects:** Browsers follow automatically, Postman shows the response
5. **HTTP Status Codes:** Tell clients what happened (201 created, 400 bad request, etc.)

---

## Quick Reference

### When to Use What Status Code

```javascript
201 Created      ← POST /shorten (success)
400 Bad Request  ← POST /shorten without longUrl
301 Redirect     ← GET /shortCode (redirect to original)
404 Not Found    ← GET /invalid (shortCode doesn't exist)
500 Server Error ← Unexpected crash
```

### Common Error Scenarios

```javascript
// Missing required field
res.status(400).json({ error: 'longUrl is required' });

// Not found
res.status(404).json({ error: 'Short URL not found' });

// Success
res.status(201).json({ shortCode, shortUrl, originalUrl });
```

---

## Next Steps

1. Review the code in `src/index.js` again with this knowledge
2. Test all scenarios in Postman
3. Try to break the API (send invalid data)
4. Come back with questions!
