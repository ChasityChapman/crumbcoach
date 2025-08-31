// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.crumbcoach.app',
  appName: 'Crumb Coach',
  // MUST match your Vite outDir (you set it to 'dist/public' in vite.config.ts)
  webDir: 'dist/public',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    cleartext: false,
    allowNavigation: [
      'https://*.supabase.co',
      'https://api.openai.com',
      'https://replit.com'
    ]
  }
}

export default config
