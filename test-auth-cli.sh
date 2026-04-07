#!/bin/bash

# URLCraft Phase 8 - JWT Authentication Interactive CLI Test
# Full testing with user registration, login, and authenticated endpoints

BASE_URL="http://localhost:3000"
RESPONSE_FILE="/tmp/urlcraft_response.json"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Global variables for auth
ACCESS_TOKEN=""
REFRESH_TOKEN=""
USER_ID=""
USERNAME=""

# API request function
api_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local auth=$4

    if [ -z "$data" ]; then
        if [ -z "$auth" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
                -H "Content-Type: application/json")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
                -H "Authorization: Bearer $auth" \
                -H "Content-Type: application/json")
        fi
    else
        if [ -z "$auth" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -d "$data")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
                -H "Authorization: Bearer $auth" \
                -H "Content-Type: application/json" \
                -d "$data")
        fi
    fi

    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')

    echo "$body" > "$RESPONSE_FILE"

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ Success (HTTP $http_code)${NC}"
    else
        echo -e "${RED}✗ Error (HTTP $http_code)${NC}"
    fi

    echo ""
    echo -e "${BLUE}Response:${NC}"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    echo ""
}

# Show menu
show_menu() {
    clear
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║       URLCraft v0.8.0 - JWT Authentication Test CLI            ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    if [ -z "$USERNAME" ]; then
        echo -e "${YELLOW}Status:${NC} Not authenticated"
    else
        echo -e "${GREEN}Status:${NC} Logged in as ${CYAN}$USERNAME${NC} (User ID: $USER_ID)"
        echo -e "Access Token: ${YELLOW}${ACCESS_TOKEN:0:20}...${NC}"
    fi

    echo ""
    echo -e "${YELLOW}=== Authentication ===${NC}"
    echo "1. Register new user"
    echo "2. Login with existing user"
    echo "3. Refresh access token"
    echo "4. Logout"
    echo ""

    if [ -n "$USERNAME" ]; then
        echo -e "${YELLOW}=== URL Operations (Requires Auth) ===${NC}"
        echo "5. Create short URL"
        echo "6. Create bulk short URLs"
        echo "7. List my short URLs"
        echo "8. Get URL stats"
        echo "9. Delete short URL"
        echo ""
    fi

    echo -e "${YELLOW}=== Public Operations ===${NC}"
    echo "10. Redirect to short URL"
    echo "11. View API info"
    echo "12. Exit"
    echo ""
}

# Register user
register_user() {
    clear
    echo -e "${CYAN}=== Register New User ===${NC}"
    echo ""
    read -p "Enter username (3-30 chars): " username
    read -p "Enter email: " email
    read -sp "Enter password (min 8 chars): " password
    echo ""

    data="{\"username\": \"$username\", \"email\": \"$email\", \"password\": \"$password\"}"
    api_request "POST" "/auth/register" "$data"

    if [ -f "$RESPONSE_FILE" ]; then
        ACCESS_TOKEN=$(grep -o '"accessToken":"[^"]*"' "$RESPONSE_FILE" | cut -d'"' -f4 | head -1)
        REFRESH_TOKEN=$(grep -o '"refreshToken":"[^"]*"' "$RESPONSE_FILE" | cut -d'"' -f4 | head -1)
        USER_ID=$(grep -o '"userId":[0-9]*' "$RESPONSE_FILE" | cut -d':' -f2 | head -1)
        USERNAME=$username

        if [ -n "$ACCESS_TOKEN" ]; then
            echo -e "${GREEN}✅ Registration successful! You are now logged in.${NC}"
        fi
    fi

    read -p "Press Enter to continue..."
}

# Login user
login_user() {
    clear
    echo -e "${CYAN}=== User Login ===${NC}"
    echo ""
    read -p "Enter username: " username
    read -sp "Enter password: " password
    echo ""

    data="{\"username\": \"$username\", \"password\": \"$password\"}"
    api_request "POST" "/auth/login" "$data"

    if [ -f "$RESPONSE_FILE" ]; then
        ACCESS_TOKEN=$(grep -o '"accessToken":"[^"]*"' "$RESPONSE_FILE" | cut -d'"' -f4 | head -1)
        REFRESH_TOKEN=$(grep -o '"refreshToken":"[^"]*"' "$RESPONSE_FILE" | cut -d'"' -f4 | head -1)
        USER_ID=$(grep -o '"userId":[0-9]*' "$RESPONSE_FILE" | cut -d':' -f2 | head -1)
        USERNAME=$username

        if [ -n "$ACCESS_TOKEN" ]; then
            echo -e "${GREEN}✅ Login successful!${NC}"
        fi
    fi

    read -p "Press Enter to continue..."
}

# Refresh token
refresh_token_func() {
    clear
    echo -e "${CYAN}=== Refresh Access Token ===${NC}"
    echo ""

    if [ -z "$REFRESH_TOKEN" ]; then
        echo -e "${RED}❌ No refresh token available. Please login first.${NC}"
        read -p "Press Enter to continue..."
        return
    fi

    data="{\"refreshToken\": \"$REFRESH_TOKEN\"}"
    api_request "POST" "/auth/refresh" "$data"

    if [ -f "$RESPONSE_FILE" ]; then
        NEW_TOKEN=$(grep -o '"accessToken":"[^"]*"' "$RESPONSE_FILE" | cut -d'"' -f4 | head -1)
        if [ -n "$NEW_TOKEN" ]; then
            ACCESS_TOKEN=$NEW_TOKEN
            echo -e "${GREEN}✅ Token refreshed successfully!${NC}"
        fi
    fi

    read -p "Press Enter to continue..."
}

# Logout
logout_user() {
    clear
    echo -e "${CYAN}=== Logout ===${NC}"
    echo ""

    if [ -z "$ACCESS_TOKEN" ]; then
        echo -e "${RED}❌ Not logged in.${NC}"
        read -p "Press Enter to continue..."
        return
    fi

    data="{\"refreshToken\": \"$REFRESH_TOKEN\"}"
    api_request "POST" "/auth/logout" "$data" "$ACCESS_TOKEN"

    ACCESS_TOKEN=""
    REFRESH_TOKEN=""
    USER_ID=""
    USERNAME=""

    echo -e "${GREEN}✅ Logged out successfully!${NC}"
    read -p "Press Enter to continue..."
}

# Create short URL
create_short_url() {
    clear
    echo -e "${CYAN}=== Create Short URL ===${NC}"
    echo ""

    if [ -z "$ACCESS_TOKEN" ]; then
        echo -e "${RED}❌ Please login first.${NC}"
        read -p "Press Enter to continue..."
        return
    fi

    read -p "Enter long URL: " long_url
    read -p "Enter expiration (optional, e.g., '24h', '7d'): " expires_in

    if [ -z "$expires_in" ]; then
        data="{\"longUrl\": \"$long_url\"}"
    else
        data="{\"longUrl\": \"$long_url\", \"expiresIn\": \"$expires_in\"}"
    fi

    api_request "POST" "/shorten" "$data" "$ACCESS_TOKEN"
    read -p "Press Enter to continue..."
}

# List user's URLs
list_my_urls() {
    clear
    echo -e "${CYAN}=== My Short URLs ===${NC}"
    echo ""

    if [ -z "$ACCESS_TOKEN" ]; then
        echo -e "${RED}❌ Please login first.${NC}"
        read -p "Press Enter to continue..."
        return
    fi

    api_request "GET" "/my-urls" "" "$ACCESS_TOKEN"
    read -p "Press Enter to continue..."
}

# View API info
view_api_info() {
    clear
    echo -e "${CYAN}=== API Information ===${NC}"
    echo ""
    api_request "GET" "/" ""
    read -p "Press Enter to continue..."
}

# Main loop
main() {
    while true; do
        show_menu
        read -p "Select option (1-12): " choice

        case $choice in
            1) register_user ;;
            2) login_user ;;
            3) refresh_token_func ;;
            4) logout_user ;;
            5) 
                if [ -n "$USERNAME" ]; then
                    create_short_url
                else
                    echo -e "${RED}❌ Please login first.${NC}"
                    sleep 2
                fi
                ;;
            7) list_my_urls ;;
            10) 
                clear
                echo -e "${CYAN}=== Redirect to Short URL ===${NC}"
                read -p "Enter short code: " short_code
                echo "URL: $BASE_URL/$short_code"
                curl -s -I "$BASE_URL/$short_code" | head -5
                echo ""
                read -p "Press Enter to continue..."
                ;;
            11) view_api_info ;;
            12)
                echo -e "${GREEN}Goodbye!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid option.${NC}"
                sleep 2
                ;;
        esac
    done
}

main
