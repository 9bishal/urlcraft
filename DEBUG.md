# URLCraft - Debugging Cheat Sheet

Quick solutions to common problems.

## Server Issues

### Problem: "Cannot find module 'express'"

**Solution:**
```bash
npm install
```

**Why:** Dependencies aren't installed yet.

---

### Problem: "Port 3000 already in use"

**Solution:**
```bash
# Option 1: Stop the server on port 3000
# Kill the process: Press Ctrl+C in terminal

# Option 2: Use a different port
# Edit src/index.js, change:
const PORT = 3000;
// to:
const PORT = 3001;
```

**Why:** Another app is using port 3000.

---

### Problem: Server crashes with error

**Check:**
1. Is there a typo in the code?
2. Is the JSON syntax valid?
3. Are all dependencies installed?

**Fix:**
```bash
# Restart server
npm run dev

# Check for errors in the code
npm start
```

---

## Postman Issues

### Problem: "Cannot POST /shorten"

**Checklist:**
- [ ] Server is running (`npm run dev`)
- [ ] URL is correct: `http://localhost:3000/shorten`
- [ ] Method is set to POST (not GET)
- [ ] Body tab is selected
- [ ] Body format is "raw" and "JSON"
- [ ] JSON is valid (check for missing quotes, commas)

**Fix:**
```json
{
  "longUrl": "https://example.com"
}
```

**Note:** Make sure the closing brace `}` is on its own line.

---

### Problem: Getting error "longUrl is required"

**Cause:** You didn't include `longUrl` in the body.

**Fix:**
```json
{
  "longUrl": "https://example.com"
}
```

**Check:**
- Is the field name spelled correctly? (Must be `longUrl`, not `long_url` or `longURL`)
- Is it inside the `{}`?
- Is the URL wrapped in quotes?

---

### Problem: "Can't see the response"

**Solution:**
1. Look for the response panel (bottom of Postman)
2. Click on "Body" tab to see the response
3. Make sure you clicked "Send" (blue button)

---

## API Testing Checklist

Before saying it's broken, test this order:

### 1. Server Running?
```bash
# Terminal should show:
✅ URLCraft server running on http://localhost:3000
```

### 2. Can you reach the root?
```
GET http://localhost:3000/

Expected response:
{
  "message": "👋 Welcome to URLCraft - URL Shortener API",
  ...
}
```

### 3. Can you create a short URL?
```
POST http://localhost:3000/shorten
Body: { "longUrl": "https://github.com" }

Expected response:
{
  "shortCode": "xY7bK2",
  "shortUrl": "http://localhost:3000/xY7bK2",
  "originalUrl": "https://github.com"
}
Status: 201
```

### 4. Can you redirect?
```
GET http://localhost:3000/xY7bK2

Expected response:
Status: 301 Moved Permanently
Location header: https://github.com
```

### 5. Does error handling work?
```
POST http://localhost:3000/shorten
Body: {}

Expected response:
{
  "error": "longUrl is required"
}
Status: 400
```

---

## Common Code Mistakes

### Mistake 1: Wrong JSON syntax
```javascript
// ❌ WRONG (missing quotes)
{
  longUrl: "https://example.com"
}

// ✅ CORRECT
{
  "longUrl": "https://example.com"
}
```

### Mistake 2: Forgot to return in error
```javascript
// ❌ WRONG (code continues after error)
if (!longUrl) {
  res.status(400).json({ error: '...' });
}
// This still runs!

// ✅ CORRECT (return stops execution)
if (!longUrl) {
  return res.status(400).json({ error: '...' });
}
```

### Mistake 3: Wrong HTTP method
```javascript
// ❌ WRONG (route doesn't handle GET)
app.post('/shorten', ...);
// But you try: GET /shorten

// ✅ CORRECT
app.post('/shorten', ...);      // Handles POST
app.get('/somewhere', ...);     // Handles GET
```

### Mistake 4: Misspelled field name
```javascript
// ❌ WRONG (looking for "long_url" but body has "longUrl")
const { long_url } = req.body;
// Server gets undefined

// ✅ CORRECT
const { longUrl } = req.body;
```

---

## Understanding Error Messages

### "Cannot GET /"
**Meaning:** No GET handler for `/` route  
**Check:** Did you add the GET / endpoint?  
**Code:**
```javascript
app.get('/', (req, res) => {
  res.json({ message: '...' });
});
```

---

### "Cannot POST /shorten"
**Meaning:** Server not running OR wrong URL  
**Check:**
- Is server running? (`npm run dev`)
- Is URL spelled correctly?
- Are you using POST (not GET)?

---

### "SyntaxError: Unexpected token"
**Meaning:** Invalid JSON in request body  
**Check:**
- Did you use double quotes? (`"` not `'`)
- Did you remember colons? (`"key": value`)
- Did you forget commas between fields?

**Valid JSON example:**
```json
{
  "field1": "value1",
  "field2": "value2"
}
```

---

## Quick Fixes to Try

1. **Restart server:**
   ```bash
   # Ctrl+C to stop
   npm run dev
   ```

2. **Check syntax:**
   - Open `src/index.js`
   - Look for red underlines (errors)

3. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules
   npm install
   ```

4. **Check the code:**
   - Is validation happening?
   - Are responses correct?
   - Are all brackets closed?

---

## Testing New Features

When you add a new endpoint, test in this order:

1. **Does it compile?** (No red errors in editor)
2. **Does server start?** (Run `npm run dev`)
3. **Does Postman find it?** (Can you POST/GET?)
4. **Does it return data?** (Check response body)
5. **Is the response format correct?** (Valid JSON?)
6. **Does error handling work?** (Send bad data)

---

## Need Help?

**Step 1:** Check this file  
**Step 2:** Check `CONCEPTS.md` for details  
**Step 3:** Check `TESTING.md` for Postman setup  
**Step 4:** Read the error message carefully  
**Step 5:** Check `src/index.js` comments  

---

## Key Reminders

- 🔴 Server must be running for Postman to work
- 📝 Always use double quotes in JSON
- 🔗 Check URLs match exactly (case-sensitive!)
- 💾 Save files before restarting server
- ✅ Test one thing at a time
- 🐛 Read error messages carefully - they tell you what's wrong!
