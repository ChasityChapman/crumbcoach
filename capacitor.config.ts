import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.crumbcoach.app',
  appName: 'Crumb Coach',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    cleartext: false, // Force HTTPS for security
    allowNavigation: [
      'https://*.supabase.co',
      'https://api.openai.com',
      'https://replit.com'
    ]
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'AAB', // Use AAB for Google Play Store
      signingType: 'apksigner'
    },
    backgroundColor: '#fdf6f3',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false // Disable for production
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#fdf6f3',
    allowsLinkPreview: false,
    preferredContentMode: 'mobile',
    allowsInlineMediaPlayback: true,
    allowsBackForwardNavigationGestures: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    Camera: {
      permissions: ['camera', 'photos'],
      source: 'camera'
    },
    Device: {},
    StatusBar: {
      style: 'light',
      backgroundColor: '#d97706',
      overlay: false
    },
    SplashScreen: {
      launchShowDuration: 3000, // Slightly longer for branding
      backgroundColor: '#d97706',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    },
    App: {
      appendUserAgent: 'CrumbCoach/1.0.0'
    }
  }
};

export default config;
