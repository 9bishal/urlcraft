# Testing Guide for URLCraft (Phase 1)

This guide teaches you how to test the API using **Postman**, a tool for testing APIs.

## What is Postman?

Postman is an application that lets you:
- Send HTTP requests to your server
- View responses
- Test different endpoints

Think of it like a web browser, but more powerful—you can send data, test different request types, and inspect responses.

## HTTP Methods Explained

Before testing, understand these two main HTTP methods:

### 1. GET Request
- **Purpose:** Retrieve/fetch data
- **Analogy:** Asking "Can I have this information?"
- **Example:** Get a web page, get weather data
- **No Body:** GET requests don't include data in the body

### 2. POST Request
- **Purpose:** Create/submit new data
- **Analogy:** Submitting a form with information
- **Example:** Create a new user, create a short URL
- **Includes Body:** You send JSON data in the body

### 3. Redirect (301)
- **Purpose:** Tell browser to go to a different URL
- **Analogy:** "Check the new address instead"
- **In Our App:** When you visit a short code, it redirects to the original URL

---

## Step 1: Download & Install Postman

1. Go to [postman.com](https://www.postman.com/downloads/)
2. Download the free version
3. Install it on your computer
4. Open Postman

---

## Step 2: Start Your URLCraft Server

Before testing, the server must be running. Open a terminal and run:

```bash
cd /Users/bishalkumarshah/urlcraft
npm install       # First time only - installs dependencies
npm run dev       # Start server with auto-reload
```

You should see:
```
✅ URLCraft server running on http://localhost:3000
📝 API Documentation:
   POST /shorten - Create a short URL
   GET /:shortCode - Redirect to original URL
```

---

## Step 3: Test POST /shorten (Create Short URL)

### In Postman:

**Step A: Set Request Type to POST**
1. Open Postman
2. At the top left, click the dropdown that says "GET"
3. Select "POST" from the list

**Step B: Enter the URL**
1. In the URL field (next to POST), paste: `http://localhost:3000/shorten`

**Step C: Add Request Body (JSON)**
1. Click the "Body" tab (below the URL field)
2. Select "raw" (radio button on the left)
3. In the dropdown that says "Text", select "JSON"
4. Paste this in the large text field:

```json
{
  "longUrl": "https://www.example.com/blog/my-long-article-about-web-development"
}
```

**Step D: Send the Request**
1. Click the blue "Send" button

### Expected Response:

```json
{
  "shortCode": "aBc123",
  "shortUrl": "http://localhost:3000/aBc123",
  "originalUrl": "https://www.example.com/blog/my-long-article-about-web-development"
}
```

**What This Means:**
- `shortCode`: Your unique 6-character code
- `shortUrl`: The shortened URL you can share
- `originalUrl`: The original long URL

---

## Step 4: Test GET /:shortCode (Redirect)

### In Postman:

**Step A: Set Request Type to GET**
1. Click the dropdown that currently says "POST"
2. Select "GET"

**Step B: Enter the Short URL**
1. In the URL field, paste: `http://localhost:3000/aBc123`
   - Replace `aBc123` with the shortCode from your previous response

**Step C: Send the Request**
1. Click the blue "Send" button

### Expected Response:

Postman will show:
- **Status Code:** `301` (Redirect)
- **Headers tab:** You'll see `Location: https://www.example.com/blog/...`

**What This Means:**
- The server says "Go to this location instead" (the original URL)
- In a real browser, it would automatically take you to the original URL

---

## Step 5: Test Error Handling

### Test 1: Missing Required Field

**POST** `/shorten` with empty body:

1. Set to POST
2. URL: `http://localhost:3000/shorten`
3. Body → raw → JSON:
```json
{
  "longUrl": ""
}
```
4. Send

**Expected Response:**
```json
{
  "error": "longUrl is required"
}
```

### Test 2: Non-existent Short Code

**GET** `/invalid123`

1. Set to GET
2. URL: `http://localhost:3000/invalid123`
3. Send

**Expected Response:**
```json
{
  "error": "Short URL not found"
}
```

---

## Summary of Commands

| Action | Method | URL | Body |
|--------|--------|-----|------|
| Create short URL | POST | `localhost:3000/shorten` | `{"longUrl": "..."}` |
| Visit short URL | GET | `localhost:3000/{shortCode}` | None |

---

## Troubleshooting

**Problem:** "Cannot POST /shorten"
- **Solution:** Make sure the server is running (see Step 2)

**Problem:** "Connection refused"
- **Solution:** Server isn't running. Run `npm run dev` in the terminal

**Problem:** Response shows error about missing field
- **Solution:** Make sure you included `longUrl` in the JSON body

**Problem:** Can't see the response
- **Solution:** Click the "Body" tab in the Postman response area

---

## Next Steps

Once you've tested both endpoints:
1. Create 3 different short URLs
2. Test redirecting to each one
3. Try the error cases
4. **Then let me know:** What happened? Any questions?
