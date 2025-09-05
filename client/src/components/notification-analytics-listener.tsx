import { useEffect } from 'react';
import { timelineAnalytics } from '@/lib/timeline-analytics';

interface NotificationAnalyticsListenerProps {
  bakeId?: string;
}

export default function NotificationAnalyticsListener({ bakeId }: NotificationAnalyticsListenerProps) {
  useEffect(() => {
    // Listen for notification tap events
    const handleNotificationTap = (event: CustomEvent) => {
      const { stepName, bakeId: eventBakeId, type } = event.detail;
      
      if (!bakeId || eventBakeId !== bakeId) return;
      
      timelineAnalytics.trackNotificationTap({
        bakeId: eventBakeId,
        stepId: event.detail.stepId || 'unknown',
        stepName: stepName || 'unknown',
        notificationType: type || 't0',
        tappedAt: new Date(),
        scheduledTime: new Date(event.detail.scheduledTime || Date.now()),
        responseTime: event.detail.responseTime || 0
      });
    };

    // Listen for in-app notification events (DND mode)
    const handleInAppNotification = (event: CustomEvent) => {
      const { stepName, bakeId: eventBakeId, type, timestamp } = event.detail;
      
      if (!bakeId || eventBakeId !== bakeId) return;
      
      // Track as notification tap when user interacts with in-app banner
      timelineAnalytics.trackNotificationTap({
        bakeId: eventBakeId,
        stepId: event.detail.stepId || 'unknown', 
        stepName: stepName || 'unknown',
        notificationType: type || 't0',
        tappedAt: new Date(),
        scheduledTime: new Date(timestamp || Date.now()),
        responseTime: 0 // Immediate for in-app notifications
      });
    };

    // Listen for app restoration events to track missed notifications
    const handleNotificationsReconciled = (event: CustomEvent) => {
      const { rescheduled, expired } = event.detail;
      
      // If notifications were expired/rescheduled, it means they were missed
      if (expired > 0 && bakeId) {
        // This is a general indicator - specific step tracking would need more data
        console.log(`${expired} notifications were missed and expired for potential bake ${bakeId}`);
      }
    };

    // Listen for app visibility change to detect potential missed notifications
    const handleVisibilityChange = () => {
      if (!document.hidden && bakeId) {
        // User just returned to the app - check if notifications were missed
        const now = new Date();
        const lastVisibility = localStorage.getItem('lastAppVisibility');
        
        if (lastVisibility) {
          const timeDiff = now.getTime() - new Date(lastVisibility).getTime();
          const minutesAway = Math.floor(timeDiff / (1000 * 60));
          
          // If user was away for more than 10 minutes, they might have missed notifications
          if (minutesAway > 10) {
            // This would be enhanced with specific step/notification data
            console.log(`User returned after ${minutesAway} minutes - potential missed notifications`);
          }
        }
        
        localStorage.setItem('lastAppVisibility', now.toISOString());
      }
    };

    // Add event listeners
    window.addEventListener('bake-step-alarm', handleNotificationTap as EventListener);
    window.addEventListener('in-app-notification', handleInAppNotification as EventListener);
    window.addEventListener('notifications-reconciled', handleNotificationsReconciled as EventListener);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Track initial visibility
    localStorage.setItem('lastAppVisibility', new Date().toISOString());

    // Cleanup
    return () => {
      window.removeEventListener('bake-step-alarm', handleNotificationTap as EventListener);
      window.removeEventListener('in-app-notification', handleInAppNotification as EventListener);
      window.removeEventListener('notifications-reconciled', handleNotificationsReconciled as EventListener);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [bakeId]);

  // Enhanced notification missed detection
  useEffect(() => {
    if (!bakeId) return;

    // Set up an interval to check for potentially missed notifications
    const checkMissedNotifications = () => {
      const now = new Date();
      const lastActivity = localStorage.getItem(`lastActivity_${bakeId}`);
      
      if (lastActivity) {
        const timeDiff = now.getTime() - new Date(lastActivity).getTime();
        const minutesInactive = Math.floor(timeDiff / (1000 * 60));
        
        // If user hasn't interacted for more than 15 minutes during an active bake
        if (minutesInactive > 15) {
          // Mark potential missed notifications - this would be enhanced with specific step data
          console.log(`Potential missed notifications detected for bake ${bakeId} - ${minutesInactive}m inactive`);
        }
      }
      
      localStorage.setItem(`lastActivity_${bakeId}`, now.toISOString());
    };

    // Check every 5 minutes
    const interval = setInterval(checkMissedNotifications, 5 * 60 * 1000);
    
    // Initial check
    checkMissedNotifications();

    return () => clearInterval(interval);
  }, [bakeId]);

  // This component doesn't render anything - it's just for analytics
  return null;
}

// Hook for tracking user interactions with steps
export function useStepInteractionTracking(bakeId: string) {
  const trackStepInteraction = (stepId: string, action: string) => {
    // Update last activity timestamp
    localStorage.setItem(`lastActivity_${bakeId}`, new Date().toISOString());
    
    // Track specific step interactions
    console.log(`Step interaction: ${action} on step ${stepId} for bake ${bakeId}`);
  };

  return { trackStepInteraction };
}