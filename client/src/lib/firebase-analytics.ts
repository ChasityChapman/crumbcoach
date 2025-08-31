import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import { Capacitor } from '@capacitor/core';

let analytics: any = null;
let isInitialized = false;

export function initFirebaseAnalytics() {
  // Only initialize in production and on native platforms
  if (import.meta.env.MODE !== 'production') {
    console.log('Firebase Analytics: Disabled in development mode');
    return;
  }

  if (!Capacitor.isNativePlatform()) {
    console.log('Firebase Analytics: Web mode - analytics disabled');
    return;
  }

  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };

  // Check if required config is available
  if (!firebaseConfig.projectId || !firebaseConfig.appId) {
    console.log('Firebase Analytics: Configuration not provided - skipping initialization');
    return;
  }

  try {
    const app = initializeApp(firebaseConfig);
    analytics = getAnalytics(app);
    isInitialized = true;
    console.log('Firebase Analytics: Initialized successfully');
  } catch (error) {
    console.error('Firebase Analytics: Failed to initialize:', error);
  }
}

// Track screen views (for mobile app navigation)
export function trackScreenView(screenName: string, screenClass?: string) {
  if (!isInitialized || !analytics) return;

  try {
    logEvent(analytics as any, 'screen_view' as any, {
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
  } catch (error) {
    console.error('Firebase Analytics: Failed to track screen view:', error);
  }
}

// Track user actions (recipe creation, bake start, etc.)
export function trackUserAction(action: string, parameters?: Record<string, any>) {
  if (!isInitialized || !analytics) return;

  try {
    // Use custom_event for tracking user actions
    logEvent(analytics, 'custom_event', {
      event_name: action,
      ...parameters,
      app_version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      platform: Capacitor.getPlatform(),
    });
  } catch (error) {
    console.error('Firebase Analytics: Failed to track user action:', error);
  }
}

// Track recipe interactions
export function trackRecipeEvent(eventType: 'create' | 'view' | 'edit' | 'delete', recipeId?: string) {
  trackUserAction('recipe_interaction', {
    event_type: eventType,
    recipe_id: recipeId,
  });
}

// Track baking progress
export function trackBakeEvent(eventType: 'start' | 'complete' | 'abandon', bakeId?: string, recipeId?: string) {
  trackUserAction('bake_interaction', {
    event_type: eventType,
    bake_id: bakeId,
    recipe_id: recipeId,
  });
}

// Track photo captures and analysis
export function trackPhotoEvent(eventType: 'capture' | 'analyze' | 'save', analysisType?: string) {
  trackUserAction('photo_interaction', {
    event_type: eventType,
    analysis_type: analysisType,
  });
}

// Track timeline and planning features
export function trackTimelineEvent(eventType: 'create' | 'adjust' | 'complete') {
  trackUserAction('timeline_interaction', {
    event_type: eventType,
  });
}

// Track starter log entries
export function trackStarterEvent(eventType: 'feed' | 'log' | 'discard') {
  trackUserAction('starter_interaction', {
    event_type: eventType,
  });
}

// Track sensor readings and environmental data
export function trackSensorEvent(sensorType: 'temperature' | 'humidity', value: number) {
  trackUserAction('sensor_reading', {
    sensor_type: sensorType,
    value: Math.round(value),
  });
}

// Track user engagement
export function trackEngagement(duration: number, screenName?: string) {
  if (!isInitialized || !analytics) return;

  try {
    logEvent(analytics, 'user_engagement', {
      engagement_time_msec: duration,
      screen_name: screenName,
    });
  } catch (error) {
    console.error('Firebase Analytics: Failed to track engagement:', error);
  }
}

// Set user properties for analytics segmentation
export function setAnalyticsUserProperties(properties: {
  userLevel?: 'beginner' | 'intermediate' | 'expert';
  preferredBreadType?: string;
  recipesCreated?: number;
  bakesCompleted?: number;
}) {
  if (!isInitialized || !analytics) return;

  try {
    setUserProperties(analytics, {
      user_level: properties.userLevel,
      preferred_bread_type: properties.preferredBreadType,
      recipes_created: properties.recipesCreated?.toString(),
      bakes_completed: properties.bakesCompleted?.toString(),
    });
  } catch (error) {
    console.error('Firebase Analytics: Failed to set user properties:', error);
  }
}

// Set user ID for analytics (when user logs in)
export function setAnalyticsUserId(userId: string) {
  if (!isInitialized || !analytics) return;

  try {
    setUserId(analytics, userId);
  } catch (error) {
    console.error('Firebase Analytics: Failed to set user ID:', error);
  }
}