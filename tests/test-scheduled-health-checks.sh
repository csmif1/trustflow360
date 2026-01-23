#!/bin/bash
# Test script for run-scheduled-health-checks edge function
# This simulates the cron job execution

echo "=========================================="
echo "Testing Scheduled Health Checks"
echo "=========================================="
echo ""

SUPABASE_URL="https://fnivqabphgbmkzpwowwg.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuaXZxYWJwaGdibWt6cHdvd3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NzQyMzksImV4cCI6MjA1MjU1MDIzOX0.gHOAXzJhYgvh7TPlQN2lkLq7xQZp-24EPhqRW2xqVrY"

echo "Calling run-scheduled-health-checks function..."
echo "URL: $SUPABASE_URL/functions/v1/run-scheduled-health-checks"
echo ""

curl -X POST "$SUPABASE_URL/functions/v1/run-scheduled-health-checks" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"trigger": "manual", "test": true}' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.'

echo ""
echo "=========================================="
echo "Test completed"
echo "=========================================="
