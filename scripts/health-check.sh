#!/bin/bash

# Mobile App Health Check and Performance Monitoring
# Runs comprehensive health checks for production readiness

set -e

PROJECT_ROOT=$(dirname "$(dirname "$(realpath "$0")")")
cd "$PROJECT_ROOT"

echo "🏥 Crumb Coach Health Check"
echo "=========================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

HEALTH_SCORE=0
MAX_SCORE=0

check_status() {
    local check_name="$1"
    local status="$2"
    local weight="${3:-1}"
    
    ((MAX_SCORE+=weight))
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ $check_name${NC}"
        ((HEALTH_SCORE+=weight))
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠️  $check_name${NC}"
        ((HEALTH_SCORE+=weight/2))
    else
        echo -e "${RED}❌ $check_name${NC}"
    fi
}

echo ""
echo "🔍 System Dependencies"
echo "---------------------"

# Node.js version check
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    if [[ "$NODE_VERSION" =~ ^v(18|20|21) ]]; then
        check_status "Node.js version ($NODE_VERSION)" "PASS"
    else
        check_status "Node.js version ($NODE_VERSION) - recommend v18+" "WARN"
    fi
else
    check_status "Node.js installed" "FAIL"
fi

# NPM dependencies
if [ -f "package.json" ] && npm list --depth=0 &> /dev/null; then
    check_status "NPM dependencies" "PASS"
else
    check_status "NPM dependencies" "FAIL"
fi

# Database connectivity
if [ -n "$DATABASE_URL" ]; then
    check_status "Database URL configured" "PASS"
else
    check_status "Database URL configured" "FAIL"
fi

echo ""
echo "📱 Mobile Platform Readiness"
echo "----------------------------"

# Capacitor CLI
if command -v cap &> /dev/null; then
    CAP_VERSION=$(npx cap --version 2>/dev/null | head -1)
    check_status "Capacitor CLI ($CAP_VERSION)" "PASS"
else
    check_status "Capacitor CLI installed" "FAIL"
fi

# iOS platform
if [ -d "ios/App" ]; then
    check_status "iOS platform configured" "PASS"
    
    # Check iOS dependencies
    if [ -f "ios/App/Podfile.lock" ]; then
        check_status "iOS dependencies (CocoaPods)" "PASS"
    else
        check_status "iOS dependencies (CocoaPods)" "WARN"
    fi
else
    check_status "iOS platform configured" "FAIL"
fi

# Android platform
if [ -d "android/app" ]; then
    check_status "Android platform configured" "PASS"
    
    # Check Android Gradle
    if [ -f "android/build.gradle" ]; then
        check_status "Android build system (Gradle)" "PASS"
    else
        check_status "Android build system (Gradle)" "FAIL"
    fi
else
    check_status "Android platform configured" "FAIL"
fi

echo ""
echo "🔒 Security & Privacy"
echo "--------------------"

# HTTPS in production
if grep -q "https://" capacitor.config.ts 2>/dev/null; then
    check_status "HTTPS configuration" "PASS"
else
    check_status "HTTPS configuration" "WARN"
fi

# Sentry configuration
if [ -f "client/src/lib/sentry.ts" ]; then
    check_status "Crash reporting (Sentry)" "PASS" 2
else
    check_status "Crash reporting (Sentry)" "FAIL" 2
fi

# Privacy compliance endpoints
if grep -q "delete-account" server/routes.ts 2>/dev/null; then
    check_status "GDPR compliance endpoints" "PASS" 2
else
    check_status "GDPR compliance endpoints" "FAIL" 2
fi

echo ""
echo "⚡ Performance & Optimization"
echo "----------------------------"

# Build output size
if [ -d "client/dist" ]; then
    DIST_SIZE_MB=$(du -sm client/dist | cut -f1)
    if [ "$DIST_SIZE_MB" -lt 5 ]; then
        check_status "Bundle size (${DIST_SIZE_MB}MB) - Excellent" "PASS" 2
    elif [ "$DIST_SIZE_MB" -lt 10 ]; then
        check_status "Bundle size (${DIST_SIZE_MB}MB) - Good" "PASS"
    else
        check_status "Bundle size (${DIST_SIZE_MB}MB) - Too large" "WARN"
    fi
else
    check_status "Build output exists" "FAIL"
fi

# Service Worker
if [ -f "client/public/sw.js" ]; then
    check_status "Service Worker for offline support" "PASS"
else
    check_status "Service Worker for offline support" "WARN"
fi

# Image optimization
IMAGE_COUNT=$(find client/public -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" 2>/dev/null | wc -l)
if [ "$IMAGE_COUNT" -gt 0 ]; then
    LARGE_IMAGES=$(find client/public -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -size +500k 2>/dev/null | wc -l)
    if [ "$LARGE_IMAGES" -eq 0 ]; then
        check_status "Image optimization (no large images)" "PASS"
    else
        check_status "Image optimization ($LARGE_IMAGES large images found)" "WARN"
    fi
else
    check_status "Image optimization (no images to check)" "PASS"
fi

echo ""
echo "🚀 Deployment Readiness"
echo "----------------------"

# App icons
if [ -f "client/public/icon-192.png" ] && [ -f "client/public/icon-512.png" ]; then
    check_status "PWA icons" "PASS"
else
    check_status "PWA icons" "WARN"
fi

# Native icons
IOS_ICONS_COUNT=$(find ios/App/App/Assets.xcassets/AppIcon.appiconset -name "*.png" 2>/dev/null | wc -l)
if [ "$IOS_ICONS_COUNT" -gt 5 ]; then
    check_status "iOS app icons" "PASS"
else
    check_status "iOS app icons" "WARN"
fi

ANDROID_ICONS_COUNT=$(find android/app/src/main/res -name "ic_launcher*.png" 2>/dev/null | wc -l)
if [ "$ANDROID_ICONS_COUNT" -gt 3 ]; then
    check_status "Android app icons" "PASS"
else
    check_status "Android app icons" "WARN"
fi

# Splash screens
if [ -f "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png" ]; then
    check_status "iOS splash screen" "PASS"
else
    check_status "iOS splash screen" "WARN"
fi

if [ -f "android/app/src/main/res/drawable/splash.png" ]; then
    check_status "Android splash screen" "PASS"
else
    check_status "Android splash screen" "WARN"
fi

echo ""
echo "📊 Health Score"
echo "==============="
echo -e "Score: ${BLUE}$HEALTH_SCORE/$MAX_SCORE${NC}"

PERCENTAGE=$((HEALTH_SCORE * 100 / MAX_SCORE))
echo -e "Percentage: ${BLUE}$PERCENTAGE%${NC}"

if [ "$PERCENTAGE" -ge 90 ]; then
    echo -e "${GREEN}🎉 Excellent! Ready for app store submission.${NC}"
elif [ "$PERCENTAGE" -ge 80 ]; then
    echo -e "${YELLOW}👍 Good! Address warnings before submission.${NC}"
elif [ "$PERCENTAGE" -ge 70 ]; then
    echo -e "${YELLOW}⚠️  Acceptable, but improvements recommended.${NC}"
else
    echo -e "${RED}❌ Needs work before app store submission.${NC}"
fi

echo ""
echo "💡 Next Steps:"
if [ "$PERCENTAGE" -ge 80 ]; then
    echo "• Run test suite: ./scripts/test-suite.sh"
    echo "• Build for stores: ./scripts/build-ios.sh release && ./scripts/build-android.sh release"
    echo "• Submit to app stores"
else
    echo "• Fix failed health checks"
    echo "• Address security and performance issues"
    echo "• Re-run health check"
fi

exit 0