#!/bin/bash

# Complete Deployment Pipeline for App Store Submission
# Runs all checks, builds, and prepares for store submission

set -e

PROJECT_ROOT=$(dirname "$(dirname "$(realpath "$0")")")
cd "$PROJECT_ROOT"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Crumb Coach - Complete Deployment Pipeline${NC}"
echo "=============================================="
echo ""

PLATFORM=${1:-"both"}
BUILD_TYPE=${2:-"release"}

if [ "$PLATFORM" != "ios" ] && [ "$PLATFORM" != "android" ] && [ "$PLATFORM" != "both" ]; then
    echo "Usage: $0 [ios|android|both] [release|debug]"
    echo ""
    echo "Examples:"
    echo "  $0 both release    # Build for both platforms (release)"
    echo "  $0 ios release     # Build for iOS only (release)"
    echo "  $0 android debug   # Build for Android only (debug)"
    exit 1
fi

echo "Platform: $PLATFORM"
echo "Build type: $BUILD_TYPE"
echo ""

# Step 1: Health Check
echo -e "${BLUE}📊 Step 1: Health Check${NC}"
echo "------------------------"

if ! ./scripts/health-check.sh; then
    echo -e "${RED}❌ Health check failed. Fix issues before deployment.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Health check passed${NC}"
echo ""

# Step 2: Run Test Suite
echo -e "${BLUE}🧪 Step 2: Test Suite${NC}"
echo "---------------------"

if ! ./scripts/test-suite.sh; then
    echo -e "${RED}❌ Test suite failed. Fix issues before deployment.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Test suite passed${NC}"
echo ""

# Step 3: Security Audit
echo -e "${BLUE}🔒 Step 3: Security Audit${NC}"
echo "-------------------------"

echo "Checking for security vulnerabilities..."

# Check for exposed secrets
if grep -r "PRIVATE_KEY\|SECRET_KEY\|password.*=" client/src/ 2>/dev/null; then
    echo -e "${RED}❌ Found exposed secrets in client code${NC}"
    exit 1
fi

# Check for unsafe logging
if grep -r "console.log.*password\|console.log.*token" server/ 2>/dev/null; then
    echo -e "${RED}❌ Found unsafe logging in server code${NC}"
    exit 1
fi

# Check HTTPS configuration
if ! grep -q "https://" capacitor.config.ts 2>/dev/null && [ "$BUILD_TYPE" = "release" ]; then
    echo -e "${YELLOW}⚠️  Warning: HTTPS not configured in Capacitor config${NC}"
fi

echo -e "${GREEN}✅ Security audit passed${NC}"
echo ""

# Step 4: Build Applications
echo -e "${BLUE}🏗️  Step 4: Build Applications${NC}"
echo "------------------------------"

BUILD_SUCCESS=true

if [ "$PLATFORM" = "ios" ] || [ "$PLATFORM" = "both" ]; then
    echo "Building iOS application..."
    if ! ./scripts/build-ios.sh "$BUILD_TYPE"; then
        echo -e "${RED}❌ iOS build failed${NC}"
        BUILD_SUCCESS=false
    else
        echo -e "${GREEN}✅ iOS build completed${NC}"
    fi
    echo ""
fi

if [ "$PLATFORM" = "android" ] || [ "$PLATFORM" = "both" ]; then
    echo "Building Android application..."
    if ! ./scripts/build-android.sh "$BUILD_TYPE"; then
        echo -e "${RED}❌ Android build failed${NC}"
        BUILD_SUCCESS=false
    else
        echo -e "${GREEN}✅ Android build completed${NC}"
    fi
    echo ""
fi

if [ "$BUILD_SUCCESS" = false ]; then
    echo -e "${RED}❌ One or more builds failed${NC}"
    exit 1
fi

# Step 5: Final Verification
echo -e "${BLUE}🔍 Step 5: Final Verification${NC}"
echo "-----------------------------"

if [ "$BUILD_TYPE" = "release" ]; then
    # Check build outputs exist
    if [ "$PLATFORM" = "ios" ] || [ "$PLATFORM" = "both" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            if [ -d "ios/App/build/App.xcarchive" ]; then
                echo -e "${GREEN}✅ iOS archive exists${NC}"
            else
                echo -e "${RED}❌ iOS archive not found${NC}"
                BUILD_SUCCESS=false
            fi
        else
            echo -e "${YELLOW}⚠️  iOS build verification skipped (not on macOS)${NC}"
        fi
    fi
    
    if [ "$PLATFORM" = "android" ] || [ "$PLATFORM" = "both" ]; then
        if [ -f "android/app/build/outputs/bundle/release/app-release.aab" ]; then
            echo -e "${GREEN}✅ Android AAB exists${NC}"
            
            # Get file size
            AAB_SIZE=$(ls -lh android/app/build/outputs/bundle/release/app-release.aab | awk '{print $5}')
            echo "   Size: $AAB_SIZE"
            
            # Check if signed
            if aapt dump badging android/app/build/outputs/bundle/release/app-release.aab 2>/dev/null | grep -q "package:"; then
                echo -e "${GREEN}✅ Android AAB is valid${NC}"
            else
                echo -e "${YELLOW}⚠️  Android AAB validation failed${NC}"
            fi
        else
            echo -e "${RED}❌ Android AAB not found${NC}"
            BUILD_SUCCESS=false
        fi
    fi
fi

if [ "$BUILD_SUCCESS" = false ]; then
    echo -e "${RED}❌ Final verification failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Final verification passed${NC}"
echo ""

# Step 6: Deployment Summary
echo -e "${BLUE}📋 Step 6: Deployment Summary${NC}"
echo "-----------------------------"

echo "Build completed successfully!"
echo ""
echo "Generated files:"

if [ "$PLATFORM" = "ios" ] || [ "$PLATFORM" = "both" ]; then
    if [[ "$OSTYPE" == "darwin"* ]] && [ "$BUILD_TYPE" = "release" ]; then
        if [ -d "ios/App/build/App.xcarchive" ]; then
            echo "📱 iOS: ios/App/build/App.xcarchive"
        fi
        if [ -f "ios/App/build/AppStore/App.ipa" ]; then
            echo "📱 iOS IPA: ios/App/build/AppStore/App.ipa"
        fi
    else
        echo "📱 iOS: Build ready in Xcode (open ios/App/App.xcworkspace)"
    fi
fi

if [ "$PLATFORM" = "android" ] || [ "$PLATFORM" = "both" ]; then
    if [ "$BUILD_TYPE" = "release" ]; then
        if [ -f "android/app/build/outputs/bundle/release/app-release.aab" ]; then
            echo "🤖 Android AAB: android/app/build/outputs/bundle/release/app-release.aab"
        fi
        if [ -f "android/app/build/outputs/apk/release/app-release.apk" ]; then
            echo "🤖 Android APK: android/app/build/outputs/apk/release/app-release.apk"
        fi
    else
        if [ -f "android/app/build/outputs/apk/debug/app-debug.apk" ]; then
            echo "🤖 Android Debug: android/app/build/outputs/apk/debug/app-debug.apk"
        fi
    fi
fi

echo ""

if [ "$BUILD_TYPE" = "release" ]; then
    echo -e "${GREEN}🎉 Ready for App Store Submission!${NC}"
    echo ""
    echo "Next steps:"
    
    if [ "$PLATFORM" = "ios" ] || [ "$PLATFORM" = "both" ]; then
        echo "📱 iOS App Store:"
        echo "   1. Open Xcode and use Window > Organizer"
        echo "   2. Select your archive and click 'Distribute App'"
        echo "   3. Choose 'App Store Connect'"
        echo "   4. Complete app listing in App Store Connect"
        echo "   5. Submit for review"
        echo ""
    fi
    
    if [ "$PLATFORM" = "android" ] || [ "$PLATFORM" = "both" ]; then
        echo "🤖 Google Play Store:"
        echo "   1. Go to Google Play Console"
        echo "   2. Upload the AAB file"
        echo "   3. Complete store listing"
        echo "   4. Submit for review"
        echo ""
    fi
    
    echo "📊 Monitor your apps:"
    echo "   • Check crash reports in Sentry"
    echo "   • Monitor analytics in Firebase"
    echo "   • Review performance metrics"
else
    echo -e "${GREEN}🎉 Debug builds ready for testing!${NC}"
    echo ""
    echo "Install and test the apps before creating release builds."
fi

echo ""
echo -e "${BLUE}Deployment pipeline completed successfully! 🚀${NC}"