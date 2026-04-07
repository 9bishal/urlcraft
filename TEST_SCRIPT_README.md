# Interactive Testing Script

The `test-interactive.sh` script provides a user-friendly, interactive terminal-based interface for testing all endpoints of the URL Shortener application.

## Usage

```bash
./test-interactive.sh
```

## Features

The script offers the following menu options:

### 1. **Create Short URL**
   - Converts a long URL into a random 6-character short code
   - Example: `https://example.com` → `http://localhost:3000/abc123`

### 2. **Create Short URL with Expiration**
   - Create a short URL that expires after a specified time
   - Supports multiple expiration formats:
     - **Integer hours**: `2`, `24`, `48` (e.g., "2" creates URL that expires in 2 hours)
     - **String format**: `30m` (minutes), `2h` (hours), `7d` (days)

### 3. **Create Custom Short URL**
   - Use a custom code instead of a random one
   - Code must be 3-30 characters (alphanumeric, dash, underscore)
   - Example: `my-app-link`

### 4. **Create Bulk Short URLs**
   - Create multiple short URLs in one request (up to 100)
   - Optionally add expiration per URL using format: `url|expiration`
   - Example: `https://example.com|2h` for URL expiring in 2 hours

### 5. **Redirect (Visit Short URL)**
   - Test accessing a short URL and see the redirect
   - Shows HTTP status code and final destination
   - Displays error message if URL is expired (410 Gone)

### 6. **Get URL Stats**
   - View statistics for a short URL
   - Shows: original URL, click count, creation date, expiration status

### 7. **Delete Short URL**
   - Permanently remove a short URL from the system
   - Requires confirmation before deletion

### 8. **List All Short URLs**
   - View all short URLs in the system
   - Shows original URL, short code, click count, and expiration info

### 9. **Test Expiration**
   - Create a URL with expiration and verify it works
   - Great for testing the Phase 7 (URL expiration) feature

### 10. **Exit**
   - Gracefully exit the testing console

## Expiration Formats

The application now supports flexible expiration input:

| Format | Example | Meaning |
|--------|---------|---------|
| Integer (hours) | `2` | 2 hours from now |
| Integer (hours) | `24` | 24 hours (1 day) from now |
| Hours | `2h` | 2 hours from now |
| Days | `7d` | 7 days from now |
| Minutes | `30m` | 30 minutes from now |

## Requirements

Before running the script, ensure:

1. **Node.js application is running**
   ```bash
   npm start
   # or
   node src/index.js
   ```

2. **PostgreSQL database is available**
   - The application needs a working database connection

3. **curl command is available**
   - Most modern macOS/Linux systems have it pre-installed

4. **python3 is available** (optional, for pretty-printing JSON responses)

## Example Workflow

1. Run the script:
   ```bash
   ./test-interactive.sh
   ```

2. Select option 2 (Create with Expiration)

3. Enter a long URL: `https://github.com`

4. Enter expiration: `2` (for 2 hours) or `24h` (for 24 hours)

5. Get the short code from the response

6. Select option 6 (Get URL Stats) to view the expiration time

7. Select option 5 (Redirect) to test accessing it

## Color-Coded Output

- 🟢 **Green**: Success responses (HTTP 2xx)
- 🔴 **Red**: Error responses (HTTP 4xx/5xx)
- 🟡 **Yellow**: Informational messages
- 🔵 **Blue**: Headers and request/response information

## Features Tested

The script comprehensively tests:

- ✅ Basic URL shortening
- ✅ URL expiration (Phase 7)
- ✅ Custom short codes
- ✅ Bulk URL creation
- ✅ Redirect functionality
- ✅ Statistics retrieval
- ✅ URL deletion
- ✅ Expiration validation (410 Gone status)
- ✅ Error handling

## Notes

- All responses are automatically pretty-printed as JSON (if `python3` is available)
- The script validates URLs before sending requests
- Invalid short codes return 404 responses
- Expired URLs return 410 responses
- The script checks for server connectivity on startup
