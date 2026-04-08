#!/bin/bash

# Register a user
echo "📝 Registering user..."
REGISTER=$(curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser123",
    "email": "test123@example.com",
    "password": "password123"
  }')

TOKEN=$(echo $REGISTER | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
echo "✅ User registered, token: ${TOKEN:0:20}..."

# Create a short URL
echo ""
echo "🔗 Creating short URL..."
curl -s -X POST http://localhost:3000/shorten \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"longUrl": "https://www.google.com"}'

echo ""
echo ""
echo "✅ Done! Check dashboard at http://localhost:3001"
