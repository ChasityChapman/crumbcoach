// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli'

// Determine if we should use live reload or static files
const isDevelopment = process.env.NODE_ENV === 'development'
const useDevServer = process.env.CAPACITOR_DEV_SERVER === 'true'

const config: CapacitorConfig = {
  appId: 'com.crumbcoach.com',
  appName: 'Crumb Coach',
  webDir: 'dist/public',
  bundledWebRuntime: false,
  
  // Only include server config if explicitly enabled for development
  ...(useDevServer && isDevelopment ? {
    server: {
      androidScheme: 'http',
      cleartext: true,
      // Use Android emulator's special IP to reach host
      url: 'http://10.0.2.2:5000',
      allowNavigation: [
        'https://*.supabase.co',
        'https://api.openai.com', 
        'https://replit.com',
        'http://10.0.2.2:5000'
      ]
    }
  } : {}),
  
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  }
}

export default config
