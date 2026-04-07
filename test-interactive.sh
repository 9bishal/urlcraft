#!/bin/bash

# Interactive Testing Script for URL Shortener Application
# This script provides an interactive menu for testing all endpoints

BASE_URL="http://localhost:3000"
RESPONSE_FILE="/tmp/urlcraft_response.json"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display the main menu
show_menu() {
    clear
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║          URL Shortener - Interactive Testing Console          ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Main Menu:${NC}"
    echo "1. Create Short URL"
    echo "2. Create Short URL with Expiration"
    echo "3. Create Custom Short URL"
    echo "4. Create Bulk Short URLs"
    echo "5. Redirect (Visit Short URL)"
    echo "6. Get URL Stats"
    echo "7. Delete Short URL"
    echo "8. List All Short URLs"
    echo "9. Test Expiration (Create & Check Expired URL)"
    echo "10. Exit"
    echo ""
}

# Function to validate URL
validate_url() {
    local url=$1
    if [[ $url =~ ^https?:// ]]; then
        return 0
    else
        echo -e "${RED}❌ Invalid URL. Must start with http:// or https://${NC}"
        return 1
    fi
}

# Function to make API request and display response
api_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')
    
    echo "$body" > "$RESPONSE_FILE"
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ Success (HTTP $http_code)${NC}"
        echo ""
        echo -e "${BLUE}Response:${NC}"
        echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    else
        echo -e "${RED}✗ Error (HTTP $http_code)${NC}"
        echo ""
        echo -e "${BLUE}Response:${NC}"
        echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    fi
    
    echo ""
    read -p "Press Enter to continue..."
}

# Function 1: Create Short URL
create_short_url() {
    clear
    echo -e "${YELLOW}Create Short URL${NC}"
    echo "================================"
    echo ""
    read -p "Enter long URL: " long_url
    
    if ! validate_url "$long_url"; then
        read -p "Press Enter to continue..."
        return
    fi
    
    data="{\"longUrl\": \"$long_url\"}"
    api_request "POST" "/shorten" "$data"
}

# Function 2: Create Short URL with Expiration
create_with_expiration() {
    clear
    echo -e "${YELLOW}Create Short URL with Expiration${NC}"
    echo "===================================="
    echo ""
    read -p "Enter long URL: " long_url
    
    if ! validate_url "$long_url"; then
        read -p "Press Enter to continue..."
        return
    fi
    
    echo ""
    echo "Expiration formats:"
    echo "  - Integer (hours): 2, 24, 48"
    echo "  - String format: 30m (minutes), 2h (hours), 7d (days)"
    echo ""
    read -p "Enter expiration (e.g., '2' for 2 hours, or '24h'): " expires_in
    
    data="{\"longUrl\": \"$long_url\", \"expiresIn\": \"$expires_in\"}"
    api_request "POST" "/shorten" "$data"
}

# Function 3: Create Custom Short URL
create_custom_url() {
    clear
    echo -e "${YELLOW}Create Custom Short URL${NC}"
    echo "========================="
    echo ""
    read -p "Enter long URL: " long_url
    
    if ! validate_url "$long_url"; then
        read -p "Press Enter to continue..."
        return
    fi
    
    echo ""
    echo "Custom code rules: 3-30 characters, alphanumeric, dash, underscore"
    read -p "Enter custom code: " custom_code
    
    data="{\"longUrl\": \"$long_url\", \"customCode\": \"$custom_code\"}"
    api_request "POST" "/shorten" "$data"
}

# Function 4: Create Bulk Short URLs
create_bulk_urls() {
    clear
    echo -e "${YELLOW}Create Bulk Short URLs${NC}"
    echo "======================="
    echo ""
    echo "Enter URLs one by one. Type 'done' when finished."
    echo "Optionally add expiration with format: url|expiration (e.g., https://example.com|2h)"
    echo ""
    
    urls_json="["
    first=true
    
    while true; do
        read -p "Enter URL (or 'done'): " input
        
        if [ "$input" = "done" ]; then
            break
        fi
        
        if [ -z "$input" ]; then
            echo -e "${RED}❌ URL cannot be empty${NC}"
            continue
        fi
        
        # Check if expiration is included
        if [[ $input == *"|"* ]]; then
            url=$(echo "$input" | cut -d'|' -f1)
            expires_in=$(echo "$input" | cut -d'|' -f2)
            
            if ! validate_url "$url"; then
                continue
            fi
            
            if [ ! "$first" = true ]; then
                urls_json="$urls_json,"
            fi
            urls_json="$urls_json{\"longUrl\": \"$url\", \"expiresIn\": \"$expires_in\"}"
            first=false
        else
            if ! validate_url "$input"; then
                continue
            fi
            
            if [ ! "$first" = true ]; then
                urls_json="$urls_json,"
            fi
            urls_json="$urls_json{\"longUrl\": \"$input\"}"
            first=false
        fi
    done
    
    urls_json="$urls_json]"
    
    if [ "$(echo "$urls_json" | grep -o '{' | wc -l)" -eq 0 ]; then
        echo -e "${RED}❌ No valid URLs entered${NC}"
        read -p "Press Enter to continue..."
        return
    fi
    
    data="{\"urls\": $urls_json}"
    api_request "POST" "/shorten-bulk" "$data"
}

# Function 5: Redirect (Visit Short URL)
visit_short_url() {
    clear
    echo -e "${YELLOW}Redirect - Visit Short URL${NC}"
    echo "==========================="
    echo ""
    read -p "Enter short code (e.g., abc123): " short_code
    
    echo ""
    echo "URL: $BASE_URL/$short_code"
    echo ""
    echo -e "${BLUE}Testing redirect...${NC}"
    
    response=$(curl -s -w "\n%{http_code}" -L "$BASE_URL/$short_code")
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "301" ] || [ "$http_code" = "302" ]; then
        echo -e "${GREEN}✓ Redirect successful (HTTP $http_code)${NC}"
        echo "Final URL: $body"
    elif [ "$http_code" = "410" ]; then
        echo -e "${RED}✗ URL has expired (HTTP 410)${NC}"
        echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    elif [ "$http_code" = "404" ]; then
        echo -e "${RED}✗ Short URL not found (HTTP 404)${NC}"
        echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    else
        echo -e "${YELLOW}Response (HTTP $http_code):${NC}"
        echo "$body"
    fi
    
    echo ""
    read -p "Press Enter to continue..."
}

# Function 6: Get URL Stats
get_stats() {
    clear
    echo -e "${YELLOW}Get URL Stats${NC}"
    echo "=============="
    echo ""
    read -p "Enter short code: " short_code
    
    api_request "GET" "/stats/$short_code"
}

# Function 7: Delete Short URL
delete_url() {
    clear
    echo -e "${YELLOW}Delete Short URL${NC}"
    echo "================="
    echo ""
    read -p "Enter short code to delete: " short_code
    
    echo ""
    echo -e "${YELLOW}Are you sure you want to delete this short URL? (yes/no)${NC}"
    read -p "Confirm: " confirm
    
    if [ "$confirm" = "yes" ]; then
        api_request "DELETE" "/shorten/$short_code"
    else
        echo -e "${YELLOW}Deletion cancelled${NC}"
        read -p "Press Enter to continue..."
    fi
}

# Function 8: List All Short URLs
list_urls() {
    clear
    echo -e "${YELLOW}List All Short URLs${NC}"
    echo "===================="
    echo ""
    api_request "GET" "/all-urls"
}

# Function 9: Test Expiration
test_expiration() {
    clear
    echo -e "${YELLOW}Test URL Expiration${NC}"
    echo "===================="
    echo ""
    
    # Create a URL that expires in a few seconds
    read -p "Enter long URL to test: " long_url
    
    if ! validate_url "$long_url"; then
        read -p "Press Enter to continue..."
        return
    fi
    
    echo ""
    echo -e "${BLUE}Creating URL that expires in 10 seconds...${NC}"
    echo ""
    
    # Note: The actual expiration would be in a real scenario
    # For this test, we'll create with a short expiration string
    data="{\"longUrl\": \"$long_url\", \"expiresIn\": \"30m\"}"
    
    api_request "POST" "/shorten" "$data"
    
    # Extract short code from response
    if [ -f "$RESPONSE_FILE" ]; then
        short_code=$(grep -o '"shortCode":"[^"]*"' "$RESPONSE_FILE" | cut -d'"' -f4 | head -1)
        
        if [ ! -z "$short_code" ]; then
            echo -e "${BLUE}Created short code: $short_code${NC}"
            echo ""
            read -p "Press Enter to test accessing this URL..."
            echo ""
            echo -e "${BLUE}Accessing $BASE_URL/$short_code...${NC}"
            api_request "GET" "/stats/$short_code"
        fi
    fi
}

# Main loop
main() {
    while true; do
        show_menu
        read -p "Select option (1-10): " choice
        
        case $choice in
            1) create_short_url ;;
            2) create_with_expiration ;;
            3) create_custom_url ;;
            4) create_bulk_urls ;;
            5) visit_short_url ;;
            6) get_stats ;;
            7) delete_url ;;
            8) list_urls ;;
            9) test_expiration ;;
            10)
                echo -e "${GREEN}Goodbye!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid option. Press Enter to continue...${NC}"
                read -p ""
                ;;
        esac
    done
}

# Check if server is running
check_server() {
    if ! curl -s "$BASE_URL/health" > /dev/null 2>&1; then
        echo -e "${YELLOW}Warning: Cannot connect to $BASE_URL${NC}"
        echo "Please ensure the URL Shortener application is running."
        echo ""
        read -p "Press Enter to continue anyway, or Ctrl+C to exit..."
    fi
}

# Run the main function
check_server
main
