// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli'

// Determine if we should use live reload or static files
const isDevelopment = process.env.NODE_ENV === 'development'
const useDevServer = process.env.CAPACITOR_DEV_SERVER === 'true'

const config: CapacitorConfig = {
  appId: 'com.crumbcoach.app',
  appName: 'Crumb Coach',
  version: '1.0.0',
  webDir: 'dist/public',
  bundledWebRuntime: false,
  
  // Only include server config if explicitly enabled for development
  ...(useDevServer && isDevelopment ? {
    server: {
      androidScheme: 'http',
      cleartext: true,
      // Use Android emulator's special IP to reach host
      url: 'http://10.0.2.2:5173',
      allowNavigation: [
        'https://*.supabase.co',
        'https://api.openai.com', 
        'https://replit.com',
        'http://10.0.2.2:5173'
      ]
    }
  } : {}),
  
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#3A6E6C",
      sound: "beep.wav",
    },
    Haptics: {
      // No configuration needed
    },
    Camera: {
      permissions: {
        camera: "This app uses the camera to take photos of your sourdough starter progress."
      }
    },
    Geolocation: {
      permissions: {
        location: "This app uses location to provide ambient temperature defaults."
      }
    },
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: false,
      iosKeychainPrefix: 'crumbcoach',
      iosBiometric: {
        biometricAuth: false,
        biometricTitle: "Biometric login for Crumb Coach"
      },
      androidIsEncryption: false,
      androidBiometric: {
        biometricAuth: false,
        biometricTitle: "Biometric login for Crumb Coach", 
        biometricSubTitle: "Log in using your biometric credential",
        biometricHint: "Touch sensor"
      }
    }
  }
}

export default config
