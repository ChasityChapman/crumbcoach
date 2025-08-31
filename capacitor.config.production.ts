// capacitor.config.production.ts - Static file configuration (no live reload)
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.crumbcoach.app',
  appName: 'Crumb Coach',
  webDir: 'dist/public',
  bundledWebRuntime: false,
  // No server config - uses static files only
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
}

export default config