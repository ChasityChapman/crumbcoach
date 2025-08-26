import { initializeApp } from 'firebase/app';
import { getAnalytics, Analytics, logEvent, setUserId, setUserProperties } from 'firebase/analytics';

// Firebase configuration - you'll need to add these to your environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
let analytics: Analytics | null = null;

export const initializeFirebase = () => {
  // Only initialize in browser environment and if config is present
  if (typeof window !== 'undefined' && firebaseConfig.apiKey) {
    try {
      const app = initializeApp(firebaseConfig);
      analytics = getAnalytics(app);
      console.log('Firebase Analytics initialized');
    } catch (error) {
      console.warn('Firebase Analytics initialization failed:', error);
    }
  } else {
    console.warn('Firebase config missing - set VITE_FIREBASE_* environment variables');
  }
};

// Analytics helper functions
export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (analytics) {
    logEvent(analytics, eventName, parameters);
  }
};

export const trackPageView = (pageName: string, additionalParams?: Record<string, any>) => {
  if (analytics) {
    logEvent(analytics, 'page_view', {
      page_title: pageName,
      ...additionalParams
    });
  }
};

// Baking-specific events
export const trackBakeStarted = (recipeId: string, recipeName: string) => {
  trackEvent('bake_started', {
    recipe_id: recipeId,
    recipe_name: recipeName,
    event_category: 'baking'
  });
};

export const trackBakeCompleted = (bakeId: string, duration: number) => {
  trackEvent('bake_completed', {
    bake_id: bakeId,
    duration_minutes: duration,
    event_category: 'baking'
  });
};

export const trackRecipeCreated = (recipeId: string, difficulty: string) => {
  trackEvent('recipe_created', {
    recipe_id: recipeId,
    difficulty: difficulty,
    event_category: 'recipes'
  });
};

export const trackTutorialStarted = (tutorialId: string, tutorialTitle: string) => {
  trackEvent('tutorial_started', {
    tutorial_id: tutorialId,
    tutorial_title: tutorialTitle,
    event_category: 'tutorials'
  });
};

export const trackPhotoTaken = (bakeId: string, stepIndex?: number) => {
  trackEvent('photo_taken', {
    bake_id: bakeId,
    step_index: stepIndex,
    event_category: 'documentation'
  });
};

export const trackNoteAdded = (bakeId: string, stepIndex?: number) => {
  trackEvent('note_added', {
    bake_id: bakeId,
    step_index: stepIndex,
    event_category: 'documentation'
  });
};

export const trackTimelineAdjustment = (bakeId: string, adjustmentType: string) => {
  trackEvent('timeline_adjusted', {
    bake_id: bakeId,
    adjustment_type: adjustmentType,
    event_category: 'timeline'
  });
};

// User identification
export const setFirebaseUserId = (userId: string) => {
  if (analytics) {
    setUserId(analytics, userId);
  }
};

export const setFirebaseUserProperties = (properties: Record<string, string>) => {
  if (analytics) {
    setUserProperties(analytics, properties);
  }
};

export default analytics;