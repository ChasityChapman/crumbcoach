#!/bin/bash

# iOS Production Build and Deployment Script
# Usage: ./scripts/build-ios.sh [release|debug]

set -e

BUILD_TYPE=${1:-release}
PROJECT_ROOT=$(dirname "$(dirname "$(realpath "$0")")")

echo "🚀 Starting iOS build process..."
echo "Build type: $BUILD_TYPE"
echo "Project root: $PROJECT_ROOT"

cd "$PROJECT_ROOT"

# 1. Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf ios/App/build
rm -rf client/dist

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm ci

# 3. Build frontend for production
echo "🔨 Building frontend..."
NODE_ENV=production npm run build

# 4. Copy web assets to iOS
echo "📱 Syncing to iOS..."
npx cap sync ios

# 5. Build iOS app
echo "🏗️ Building iOS app..."
cd ios/App

if [ "$BUILD_TYPE" = "release" ]; then
    echo "Building release archive for App Store..."
    
    # Check if running on macOS
    if [[ "$OSTYPE" != "darwin"* ]]; then
        echo "❌ iOS builds require macOS and Xcode"
        echo "💡 To build on macOS:"
        echo "   1. Open ios/App/App.xcworkspace in Xcode"
        echo "   2. Select 'Generic iOS Device' or a connected device"
        echo "   3. Product > Archive"
        echo "   4. Upload to App Store Connect"
        exit 1
    fi
    
    # Check if Xcode is installed
    if ! command -v xcodebuild &> /dev/null; then
        echo "❌ Xcode is not installed or not in PATH"
        echo "💡 Install Xcode from the Mac App Store"
        exit 1
    fi
    
    echo "Building archive..."
    xcodebuild -workspace App.xcworkspace \
               -scheme App \
               -configuration Release \
               -destination generic/platform=iOS \
               -archivePath build/App.xcarchive \
               archive
    
    echo "✅ iOS release archive complete!"
    echo "📦 Archive: ios/App/build/App.xcarchive"
    
    echo "🏪 Exporting for App Store..."
    xcodebuild -exportArchive \
               -archivePath build/App.xcarchive \
               -exportPath build/AppStore \
               -exportOptionsPlist exportOptions.plist
    
    echo "✅ App Store package ready!"
    echo "📦 IPA: ios/App/build/AppStore/App.ipa"
    
else
    echo "Building debug version..."
    
    if [[ "$OSTYPE" == "darwin"* ]] && command -v xcodebuild &> /dev/null; then
        xcodebuild -workspace App.xcworkspace \
                   -scheme App \
                   -configuration Debug \
                   -destination generic/platform=iOS \
                   -archivePath build/App-Debug.xcarchive \
                   archive
        
        echo "✅ iOS debug build complete!"
        echo "📦 Archive: ios/App/build/App-Debug.xcarchive"
    else
        echo "💡 For iOS development:"
        echo "   1. Open ios/App/App.xcworkspace in Xcode"
        echo "   2. Select a simulator or connected device"
        echo "   3. Press Run (⌘+R)"
    fi
fi

cd "$PROJECT_ROOT"

echo ""
echo "🎉 iOS build process completed!"
echo ""

if [ "$BUILD_TYPE" = "release" ] && [[ "$OSTYPE" == "darwin"* ]]; then
    echo "📋 Next steps for App Store submission:"
    echo "1. Test the app on physical devices"
    echo "2. Open Xcode and use Window > Organizer"
    echo "3. Select your archive and click 'Distribute App'"
    echo "4. Choose 'App Store Connect' and follow prompts"
    echo "5. Fill out App Store listing in App Store Connect"
    echo "6. Submit for review"
fi