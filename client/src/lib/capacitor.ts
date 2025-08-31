import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { revenueCat } from "./revenuecat";

export async function initializeCapacitor() {
  // Only initialize native features on mobile platforms
  if (!Capacitor.isNativePlatform()) {
    console.log('Running in web mode - skipping native initializations');
    return;
  }

  try {
    // Initialize RevenueCat with the provided API key
    const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY || process.env.REVENUECAT_API_KEY;
    
    if (apiKey) {
      await revenueCat.initialize({ apiKey });
      console.log('RevenueCat initialized successfully');
    } else {
      console.warn('RevenueCat API key not found - skipping initialization');
    }

    // Initialize push notifications - disabled until Firebase is properly configured
    console.log('Push notifications disabled - configure Firebase to enable');
    // await initializePushNotifications();
    
  } catch (error) {
    console.error('Error initializing Capacitor features:', error);
  }
}

async function initializePushNotifications() {
  try {
    // Request permission
    const permission = await PushNotifications.requestPermissions();
    
    if (permission.receive === 'granted') {
      await PushNotifications.register();
      
      // Add listeners
      PushNotifications.addListener('registration', (token) => {
        console.log('Push registration success, token:', token.value);
        // Store the token for use with your backend
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('Error on registration:', error);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push notification received:', notification);
        // Handle foreground notifications
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push notification action performed:', notification);
        // Handle notification tap actions
      });
    } else {
      console.log('Push notification permission denied');
    }
  } catch (error) {
    console.error('Push notification initialization failed:', error);
  }
}

export { Capacitor };