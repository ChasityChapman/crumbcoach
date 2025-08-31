// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.crumbcoach.app',
  appName: 'Crumb Coach',
  // MUST match your Vite outDir (you set it to 'dist/public' in vite.config.ts)
  webDir: 'dist/public',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'http',
    cleartext: true,
    url: 'http://192.168.1.150:5000',
    allowNavigation: [
      'https://*.supabase.co',
      'https://api.openai.com',
      'https://replit.com',
      'http://192.168.1.150:5000'
    ]
  }
}

export default config
