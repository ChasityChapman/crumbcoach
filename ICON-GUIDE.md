# Crumb Coach App Icon Guide

## Current Status
✅ **SVG Icon Created**: `client/public/favicon.svg` and `client/public/crumb-coach-icon.svg`
✅ **HTML Updated**: Favicon references added to `client/index.html`
⚠️ **PNG Icons Need Update**: Current icons need to be replaced

## Icon Design
The new icon features:
- 🍞 **Sourdough bread loaf** with realistic scoring pattern
- 🌾 **Wheat stalks** as decorative elements
- 🎨 **Warm color palette**: Golden yellows (#F4C430), browns (#D2691E, #8B4513)
- 📱 **Modern design** suitable for all platforms
- ⚡ **Scalable SVG** format for crisp display at any size

## Required Icon Files

### Web (PWA)
- [x] `favicon.svg` - Modern browsers (32x32 equivalent)
- [ ] `icon-192.png` - PWA home screen (192x192)
- [ ] `icon-512.png` - PWA splash screen (512x512)

### iOS (when iOS platform added)
- [ ] `AppIcon-1024.png` - App Store (1024x1024)
- [ ] Various sizes for different devices in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

### Android
- [ ] `ic_launcher.png` - Various densities (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
- [ ] `ic_launcher_round.png` - Round launcher icons
- [ ] `ic_launcher_foreground.png` - Adaptive icon foreground

## How to Generate PNG Icons

### Option 1: Online Converter (Recommended)
1. Open `client/public/crumb-coach-icon.svg` 
2. Go to [convertio.co](https://convertio.co/svg-png/) or [cloudconvert.com](https://cloudconvert.com/svg-to-png)
3. Upload the SVG file
4. Convert to required sizes:
   - 192x192 for `icon-192.png`
   - 512x512 for `icon-512.png`
   - 1024x1024 for iOS

### Option 2: Using Node.js (if available)
```bash
npm install sharp
node -e "
const sharp = require('sharp');
const fs = require('fs');
const svg = fs.readFileSync('client/public/crumb-coach-icon.svg');

// Generate 192x192
sharp(Buffer.from(svg))
  .resize(192, 192)
  .png()
  .toFile('client/public/icon-192.png');

// Generate 512x512
sharp(Buffer.from(svg))
  .resize(512, 512)
  .png()
  .toFile('client/public/icon-512.png');
"
```

### Option 3: Design Tools
- **Figma**: Import SVG, export as PNG at required sizes
- **Sketch**: Same process as Figma
- **Adobe Illustrator**: File → Export → Export As → PNG
- **Inkscape**: File → Export PNG Image

## File Locations

```
crumbcoach/
├── client/public/
│   ├── favicon.svg              ✅ Created
│   ├── crumb-coach-icon.svg     ✅ Created  
│   ├── icon-192.png            ⚠️ Needs update
│   ├── icon-512.png            ⚠️ Needs update
│   └── manifest.json           ✅ Updated
├── ios/App/App/Assets.xcassets/AppIcon.appiconset/
│   └── (various iOS icons)     ⚠️ Needs update when iOS added
└── android/app/src/main/res/
    ├── mipmap-*dpi/            ⚠️ Needs update
    └── (various Android icons)
```

## Next Steps
1. **Convert SVG to PNG** using any of the methods above
2. **Replace existing PNG files** with new designs
3. **Test the app** to ensure icons display correctly
4. **Update iOS/Android icons** when building for mobile platforms

## Color Palette Used
- **Background**: #FFE8D4 to #F4C430 (gradient)
- **Bread Crust**: #DEB887 to #8B4513 (gradient)  
- **Scoring Lines**: #654321
- **Wheat**: #DAA520 with #B8860B stroke
- **Accent**: #CD853F

The icon maintains the warm, artisanal feeling appropriate for a sourdough baking app while being modern and recognizable at small sizes.