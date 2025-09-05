import { useState, useEffect } from "react";
import { X, Clock, Bell, AlertTriangle, Moon, CheckCircle, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InAppNotification {
  title: string;
  body: string;
  type: string;
  stepName: string;
  bakeId: string;
  requireInteraction: boolean;
  timestamp: string;
}

interface InAppNotificationBannerProps {
  onStepTap?: (bakeId: string) => void;
  onMarkDone?: (bakeId: string) => void;
  onTakePhoto?: (bakeId: string) => void;
}

export default function InAppNotificationBanner({
  onStepTap,
  onMarkDone,
  onTakePhoto
}: InAppNotificationBannerProps) {
  const [notification, setNotification] = useState<InAppNotification | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDndActive, setIsDndActive] = useState(false);

  useEffect(() => {
    const handleInAppNotification = (event: CustomEvent) => {
      setNotification(event.detail);
      setIsVisible(true);
      
      // Auto-dismiss non-interactive notifications after 5 seconds
      if (!event.detail.requireInteraction) {
        setTimeout(() => {
          setIsVisible(false);
        }, 5000);
      }
    };

    const handleDndStatusChange = (event: CustomEvent) => {
      setIsDndActive(event.detail.isDndActive);
    };

    window.addEventListener('in-app-notification', handleInAppNotification as EventListener);
    window.addEventListener('dnd-status-changed', handleDndStatusChange as EventListener);

    return () => {
      window.removeEventListener('in-app-notification', handleInAppNotification as EventListener);
      window.removeEventListener('dnd-status-changed', handleDndStatusChange as EventListener);
    };
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 't0':
      case 'start':
        return <Bell className="w-5 h-5" />;
      case 'missed':
      case 'missed-restore':
        return <AlertTriangle className="w-5 h-5" />;
      case 'bedtime':
        return <Moon className="w-5 h-5" />;
      case 'wakeup':
        return <Clock className="w-5 h-5" />;
      case 'adaptive-start':
      case 'adaptive-check':
        return <Camera className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 't0':
      case 'start':
        return 'from-blue-500 to-blue-600 border-blue-300';
      case 'missed':
      case 'missed-restore':
        return 'from-red-500 to-red-600 border-red-300';
      case 'bedtime':
        return 'from-purple-500 to-purple-600 border-purple-300';
      case 'wakeup':
        return 'from-yellow-500 to-orange-500 border-yellow-300';
      case 'adaptive-start':
      case 'adaptive-check':
        return 'from-orange-500 to-orange-600 border-orange-300';
      default:
        return 'from-blue-500 to-blue-600 border-blue-300';
    }
  };

  const getNotificationActions = (type: string) => {
    switch (type) {
      case 't0':
      case 'start':
        return [
          { label: 'View Step', action: () => onStepTap?.(notification!.bakeId) },
          { label: 'Mark Done', action: () => onMarkDone?.(notification!.bakeId) }
        ];
      case 'adaptive-check':
        return [
          { label: 'Take Photo', action: () => onTakePhoto?.(notification!.bakeId) },
          { label: 'Mark Done', action: () => onMarkDone?.(notification!.bakeId) }
        ];
      case 'missed':
      case 'missed-restore':
        return [
          { label: 'Recalibrate', action: () => onStepTap?.(notification!.bakeId) }
        ];
      default:
        return [
          { label: 'View Bake', action: () => onStepTap?.(notification!.bakeId) }
        ];
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => setNotification(null), 300); // Allow fade out animation
  };

  if (!isVisible || !notification) {
    return null;
  }

  const actions = getNotificationActions(notification.type);
  const colorClasses = getNotificationColor(notification.type);

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className={`bg-gradient-to-r ${colorClasses} text-white p-4 rounded-lg shadow-lg border-2`}>
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {getNotificationIcon(notification.type)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-sm">{notification.title}</h3>
                {isDndActive && (
                  <div className="text-xs bg-white/20 rounded px-2 py-0.5 inline-block mt-1 mb-2">
                    🔕 Do Not Disturb Active
                  </div>
                )}
                <p className="text-sm opacity-90 mt-1">{notification.body}</p>
              </div>

              {/* Close button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-white hover:bg-white/10 h-6 w-6 p-0 flex-shrink-0 ml-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Actions */}
            {actions.length > 0 && (
              <div className="flex space-x-2 mt-3">
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    size="sm"
                    onClick={() => {
                      action.action();
                      handleDismiss();
                    }}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                    variant="outline"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Priority indicator for interactive notifications */}
        {notification.requireInteraction && (
          <div className="mt-3 p-2 bg-white/10 rounded text-xs">
            📢 This notification requires your attention
          </div>
        )}
      </div>
    </div>
  );
}