#!/bin/bash

# Android Production Build and Deployment Script
# Usage: ./scripts/build-android.sh [release|debug]

set -e

BUILD_TYPE=${1:-release}
PROJECT_ROOT=$(dirname "$(dirname "$(realpath "$0")")")

echo "🚀 Starting Android build process..."
echo "Build type: $BUILD_TYPE"
echo "Project root: $PROJECT_ROOT"

cd "$PROJECT_ROOT"

# 1. Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf android/app/build
rm -rf client/dist

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm ci

# 3. Build frontend for production
echo "🔨 Building frontend..."
NODE_ENV=production npm run build

# 4. Copy web assets to Android
echo "📱 Syncing to Android..."
npx cap sync android

# 5. Build Android APK/AAB
echo "🏗️ Building Android app..."
cd android

if [ "$BUILD_TYPE" = "release" ]; then
    echo "Building release AAB for Play Store..."
    ./gradlew bundleRelease
    
    echo "Building release APK..."
    ./gradlew assembleRelease
    
    echo "✅ Android release build complete!"
    echo "📦 AAB: android/app/build/outputs/bundle/release/app-release.aab"
    echo "📦 APK: android/app/build/outputs/apk/release/app-release.apk"
    
    # Check if signing is configured
    if [ -f "app/release.keystore" ]; then
        echo "🔐 App is signed and ready for Play Store upload"
    else
        echo "⚠️ No signing key found. Configure signing for Play Store release."
    fi
else
    echo "Building debug APK..."
    ./gradlew assembleDebug
    
    echo "✅ Android debug build complete!"
    echo "📦 APK: android/app/build/outputs/apk/debug/app-debug.apk"
fi

cd "$PROJECT_ROOT"

# 6. Run basic verification
echo "🔍 Running build verification..."
if [ "$BUILD_TYPE" = "release" ]; then
    if [ -f "android/app/build/outputs/bundle/release/app-release.aab" ]; then
        echo "✅ Release AAB generated successfully"
        
        # Get file size
        AAB_SIZE=$(ls -lh android/app/build/outputs/bundle/release/app-release.aab | awk '{print $5}')
        echo "📊 AAB size: $AAB_SIZE"
    else
        echo "❌ Release AAB not found"
        exit 1
    fi
else
    if [ -f "android/app/build/outputs/apk/debug/app-debug.apk" ]; then
        echo "✅ Debug APK generated successfully"
        
        # Get file size
        APK_SIZE=$(ls -lh android/app/build/outputs/apk/debug/app-debug.apk | awk '{print $5}')
        echo "📊 APK size: $APK_SIZE"
    else
        echo "❌ Debug APK not found"
        exit 1
    fi
fi

echo ""
echo "🎉 Android build completed successfully!"
echo ""

if [ "$BUILD_TYPE" = "release" ]; then
    echo "📋 Next steps for Play Store submission:"
    echo "1. Test the release APK on physical devices"
    echo "2. Upload the AAB file to Google Play Console"
    echo "3. Fill out store listing details"
    echo "4. Submit for review"
fi