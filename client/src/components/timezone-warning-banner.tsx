import { useState, useEffect } from "react";
import { X, Globe, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimezoneChangeInfo {
  from: string;
  to: string;
  detectedAt: string;
  pendingNotifications: number;
}

interface TimezoneWarningBannerProps {
  onRecalibrate: () => void;
  onDismiss: () => void;
}

export default function TimezoneWarningBanner({
  onRecalibrate,
  onDismiss
}: TimezoneWarningBannerProps) {
  const [timezoneChange, setTimezoneChange] = useState<TimezoneChangeInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleTimezoneChange = (event: CustomEvent) => {
      const { from, to, pendingNotifications } = event.detail;
      setTimezoneChange({
        from,
        to,
        detectedAt: new Date().toISOString(),
        pendingNotifications
      });
      setIsVisible(true);
    };

    // Check for existing timezone change on mount
    const checkExistingChange = () => {
      try {
        const stored = localStorage.getItem('lastTimezoneChange');
        if (stored) {
          const changeInfo = JSON.parse(stored);
          // Only show if detected in last 2 hours
          const detectedAt = new Date(changeInfo.detectedAt);
          const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
          
          if (detectedAt > twoHoursAgo) {
            setTimezoneChange(changeInfo);
            setIsVisible(true);
          }
        }
      } catch (error) {
        console.error('Error checking timezone change:', error);
      }
    };

    checkExistingChange();
    window.addEventListener('timezone-change-detected', handleTimezoneChange as EventListener);

    return () => {
      window.removeEventListener('timezone-change-detected', handleTimezoneChange as EventListener);
    };
  }, []);

  const formatLocation = (timezone: string) => {
    return timezone.split('/').pop()?.replace(/_/g, ' ') || timezone;
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.removeItem('lastTimezoneChange');
    onDismiss();
  };

  const handleRecalibrate = () => {
    setIsVisible(false);
    localStorage.removeItem('lastTimezoneChange');
    onRecalibrate();
  };

  if (!isVisible || !timezoneChange) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg shadow-lg border border-blue-200">
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <Globe className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-sm">Timezone Change Detected</h3>
            <div className="flex items-center text-xs bg-white/20 rounded px-2 py-0.5">
              <Clock className="w-3 h-3 mr-1" />
              {timezoneChange.pendingNotifications} active timer{timezoneChange.pendingNotifications !== 1 ? 's' : ''}
            </div>
          </div>
          
          <div className="text-sm opacity-90 mb-3">
            <div className="flex items-center gap-2">
              <span>{formatLocation(timezoneChange.from)}</span>
              <ArrowRight className="w-3 h-3" />
              <span>{formatLocation(timezoneChange.to)}</span>
            </div>
            <p className="text-xs mt-1 opacity-75">
              Your bake timers may be incorrect. Recalibrate to adjust for the new timezone.
            </p>
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={handleRecalibrate}
              className="bg-white text-blue-700 hover:bg-blue-50 font-medium"
            >
              Recalibrate Timers
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-white hover:bg-white/10"
            >
              Dismiss
            </Button>
          </div>
        </div>

        {/* Close button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="text-white hover:bg-white/10 h-6 w-6 p-0 flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}