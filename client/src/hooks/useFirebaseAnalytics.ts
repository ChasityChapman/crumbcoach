import { useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import type { User } from '@shared/schema';
import {
  initializeFirebase,
  trackPageView,
  trackEvent,
  setFirebaseUserId,
  setFirebaseUserProperties,
  trackBakeStarted,
  trackBakeCompleted,
  trackRecipeCreated,
  trackTutorialStarted,
  trackPhotoTaken,
  trackNoteAdded,
  trackTimelineAdjustment
} from '@/lib/firebase';

// Hook to handle Firebase Analytics initialization and user tracking
export const useFirebaseAnalytics = () => {
  const [location] = useLocation();
  const { user } = useSupabaseAuth();

  // Initialize Firebase on mount
  useEffect(() => {
    initializeFirebase();
  }, []);

  // Set user ID and properties when user logs in
  useEffect(() => {
    if (user) {
      const typedUser = user as User;
      setFirebaseUserId(typedUser.id);
      setFirebaseUserProperties({
        user_type: 'authenticated',
        signup_method: 'email_password',
        has_first_name: typedUser.firstName ? 'yes' : 'no',
        has_profile_image: typedUser.profileImageUrl ? 'yes' : 'no'
      });
    }
  }, [user]);

  // Track page views on route changes
  useEffect(() => {
    const pageName = getPageName(location);
    trackPageView(pageName, {
      path: location,
      user_authenticated: user ? 'yes' : 'no'
    });
  }, [location, user]);

  // Return tracking functions for components to use
  return {
    trackBakeStarted,
    trackBakeCompleted,
    trackRecipeCreated,
    trackTutorialStarted,
    trackPhotoTaken,
    trackNoteAdded,
    trackTimelineAdjustment,
    trackCustomEvent: trackEvent
  };
};

// Helper function to convert route paths to readable page names
const getPageName = (path: string): string => {
  const pageMap: Record<string, string> = {
    '/': 'Home',
    '/auth': 'Authentication',
    '/recipes': 'Recipes',
    '/tutorials': 'Tutorials',
    '/recent-bakes': 'Recent Bakes',
    '/profile': 'Profile',
    '/forgot-password': 'Forgot Password',
    '/reset-password': 'Reset Password',
    '/terms-of-service': 'Terms of Service',
    '/privacy-policy': 'Privacy Policy'
  };

  // Handle dynamic routes like /bakes/:id
  if (path.startsWith('/bakes/')) {
    return 'Bake Details';
  }

  return pageMap[path] || 'Unknown Page';
};