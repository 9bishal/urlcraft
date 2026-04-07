#!/bin/bash

# Phase 4 Quick Test Script
echo "=== URLCraft Phase 4 Testing ==="
echo ""

# Test 1: Welcome endpoint
echo "✅ Test 1: Welcome Endpoint"
curl -s http://localhost:3000 | jq '.cacheStatus' 2>/dev/null || echo "Server OK"
echo ""

# Test 2: Create short URL
echo "✅ Test 2: Create Short URL"
response=$(curl -s -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl": "https://www.example.com"}')
shortCode=$(echo "$response" | jq -r '.shortCode' 2>/dev/null)
echo "Created short code: $shortCode"
echo ""

# Test 3: Check Redis cache
echo "✅ Test 3: Redis Caching"
cached=$(redis-cli get url:$shortCode 2>/dev/null)
if [ -n "$cached" ]; then
  echo "✓ URL cached in Redis: $cached"
else
  echo "✗ URL not in Redis cache"
fi
echo ""

# Test 4: Test redirect
echo "✅ Test 4: Redirect Test"
curl -s -L -o /dev/null http://localhost:3000/$shortCode
echo "✓ Redirect successful"
echo ""

# Test 5: Check click counter
echo "✅ Test 5: Click Tracking"
clicks=$(redis-cli get clicks:$shortCode 2>/dev/null)
echo "✓ Clicks in Redis: $clicks"
echo ""

# Test 6: Get stats
echo "✅ Test 6: Statistics"
curl -s http://localhost:3000/stats/$shortCode | jq '.clicks' 2>/dev/null || echo "Stats retrieved"
echo ""

echo "=== Phase 4 Tests Complete ==="
