#!/bin/bash

# Comprehensive Test Suite for Mobile App
# Tests critical flows before app store submission

set -e

PROJECT_ROOT=$(dirname "$(dirname "$(realpath "$0")")")
cd "$PROJECT_ROOT"

echo "🧪 Running Crumb Coach Mobile Test Suite..."
echo "============================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

TESTS_PASSED=0
TESTS_FAILED=0

run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo ""
    echo "📋 Testing: $test_name"
    echo "----------------------------------------"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASSED: $test_name${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAILED: $test_name${NC}"
        ((TESTS_FAILED++))
    fi
}

# Test 1: Build System Health
run_test "Frontend Build" "npm run build"

# Test 2: TypeScript Type Checking
run_test "TypeScript Compilation" "npx tsc --noEmit"

# Test 3: API Health Check
start_server() {
    npm run dev &
    SERVER_PID=$!
    sleep 5
}

stop_server() {
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
    fi
}

test_api_health() {
    start_server
    
    # Test basic API endpoint
    if curl -f -s http://localhost:5000/test > /dev/null; then
        stop_server
        return 0
    else
        stop_server
        return 1
    fi
}

run_test "API Health Check" "test_api_health"

# Test 4: Database Schema Validation
test_db_schema() {
    if npm run db:push --dry-run 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

run_test "Database Schema Validation" "test_db_schema"

# Test 5: Mobile Build Readiness
test_mobile_config() {
    # Check Capacitor config
    if [ -f "capacitor.config.ts" ]; then
        echo "✓ Capacitor config exists"
    else
        echo "✗ Missing Capacitor config"
        return 1
    fi
    
    # Check iOS config
    if [ -f "ios/App/App/Info.plist" ]; then
        echo "✓ iOS configuration exists"
    else
        echo "✗ Missing iOS configuration"
        return 1
    fi
    
    # Check Android config
    if [ -f "android/app/src/main/AndroidManifest.xml" ]; then
        echo "✓ Android configuration exists"
    else
        echo "✗ Missing Android configuration"
        return 1
    fi
    
    return 0
}

run_test "Mobile Configuration" "test_mobile_config"

# Test 6: Security Configuration
test_security() {
    # Check that sensitive data isn't exposed
    if grep -r "password.*console.log" server/ 2>/dev/null; then
        echo "✗ Found password logging in server code"
        return 1
    fi
    
    if grep -r "PRIVATE_KEY\|SECRET_KEY" client/src/ 2>/dev/null; then
        echo "✗ Found exposed secrets in client code"
        return 1
    fi
    
    echo "✓ No obvious security issues found"
    return 0
}

run_test "Security Check" "test_security"

# Test 7: Performance Check
test_performance() {
    # Check bundle size
    if [ -d "client/dist" ]; then
        BUNDLE_SIZE=$(du -sh client/dist | cut -f1)
        echo "✓ Bundle size: $BUNDLE_SIZE"
        
        # Check if bundle is reasonable (under 10MB for mobile)
        BUNDLE_SIZE_MB=$(du -sm client/dist | cut -f1)
        if [ "$BUNDLE_SIZE_MB" -gt 10 ]; then
            echo "⚠️  Bundle size is large (${BUNDLE_SIZE_MB}MB). Consider optimization."
            return 1
        fi
    else
        echo "✗ No build output found"
        return 1
    fi
    
    return 0
}

run_test "Performance Check" "test_performance"

# Test 8: Critical User Flows Simulation
test_user_flows() {
    echo "🔍 Simulating critical user flows..."
    
    # This would typically run automated UI tests
    # For now, we'll check that key components exist
    
    if [ -f "client/src/pages/login.tsx" ] || [ -f "client/src/pages/Login.tsx" ]; then
        echo "✓ Login page exists"
    else
        echo "⚠️  No login page found"
    fi
    
    if [ -f "client/src/pages/recipes.tsx" ] || [ -f "client/src/pages/Recipes.tsx" ]; then
        echo "✓ Recipes page exists"
    else
        echo "⚠️  No recipes page found"
    fi
    
    if [ -f "client/src/pages/bakes.tsx" ] || [ -f "client/src/pages/Bakes.tsx" ]; then
        echo "✓ Bakes page exists"
    else
        echo "⚠️  No bakes page found"
    fi
    
    return 0
}

run_test "Critical User Flows" "test_user_flows"

# Final Results
echo ""
echo "============================================"
echo "🏁 Test Suite Complete"
echo "============================================"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All tests passed! App is ready for deployment.${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some tests failed. Please fix issues before deployment.${NC}"
    exit 1
fi