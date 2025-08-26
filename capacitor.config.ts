import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.crumbcoach.app',
  appName: 'Crumb Coach',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https'
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK'
    },
    backgroundColor: '#fdf6f3'
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#fdf6f3', // sourdough-50 color
    allowsLinkPreview: false
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos']
    },
    Device: {},
    StatusBar: {
      style: 'light',
      backgroundColor: '#d97706' // sourdough-600
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#d97706',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    }
  }
};

export default config;
