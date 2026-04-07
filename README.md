# URLCraft - A Production-Grade URL Shortener

A modern, scalable URL shortening service built with Node.js, Express, PostgreSQL, and Redis.

## 🚀 Current Status

**Phase 4 Complete: Enterprise-Ready** ✅

## Project Phases

### Phase 1: Basic API (In-Memory) ✅
- [x] Express server setup
- [x] POST /shorten endpoint (create short URLs)
- [x] GET /:shortCode endpoint (redirect to original)
- [x] Basic error handling

### Phase 2: Database Integration (PostgreSQL) ✅
- [x] Design database schema
- [x] Replace in-memory storage with PostgreSQL
- [x] Connection pooling
- [x] Data persistence

### Phase 3: Improvements & Error Handling ✅
- [x] Unique short code generation (with DB collision check)
- [x] Comprehensive error handling (400, 404, 409, 500)
- [x] URL validation (http/https only)
- [x] Click tracking & analytics
- [x] GET /stats/:shortCode endpoint

### Phase 4: Advanced Features - Caching & Rate Limiting ✅
- [x] Redis caching (24-hour TTL for URLs and click counts)
- [x] Rate limiting (30 requests per 15 minutes on /shorten)
- [x] Graceful degradation (works without Redis)
- [x] Real-time analytics combining cache + database

### Phase 5: Custom Short Codes ✅
- [x] Allow users to choose custom short codes
- [x] Validation (3-30 chars, alphanumeric/dash/underscore)
- [x] Duplicate code detection (409 Conflict)
- [x] Support both auto-generated and custom codes
- [x] Track which codes are custom in database

## Getting Started

### Installation

```bash
npm install
```

### Running the Server

```bash
# Production mode
npm start

# Development mode (auto-restart on changes)
npm run dev
```

The server will run on `http://localhost:3000`

## API Endpoints (Phase 1)

### 1. Create Short URL

**POST** `/shorten`

**Request Body:**

```json
{
  "longUrl": "https://www.example.com/blog/my-long-article"
}
```

**Response:**

```json
{
  "shortCode": "abc123",
  "shortUrl": "http://localhost:3000/abc123",
  "originalUrl": "https://www.example.com/blog/my-long-article"
}
```

### 2. Redirect to Original URL

**GET** `/:shortCode`

**Example:**

- Request: `GET /abc123`
- Response: Redirects to the original URL

## Architecture

### Phase 1: In-Memory Storage

```text
Client → Express Server → In-Memory Map
```

Data is stored in a JavaScript Map (lost when server restarts)

### Phase 2: Database Storage (Coming Soon)

```text
Client → Express Server → PostgreSQL Database
```

---

## Development Notes

- Keep endpoints simple and RESTful
- Use proper HTTP methods (GET for retrieval, POST for creation)
- Add validation as we progress
- Test with Postman at each phase
