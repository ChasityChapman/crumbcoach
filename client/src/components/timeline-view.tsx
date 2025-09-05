import { useState, useMemo } from "react";
import { formatDistanceToNow, format, isToday, isTomorrow, isSameDay, addDays } from "date-fns";
import { Clock, Check, MoreVertical, ChevronRight, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import SkipConfirmationModal from "./skip-confirmation-modal";
import { timelineAnalytics } from "@/lib/timeline-analytics";
import { safeMap } from "@/lib/safeArray";

interface TimelineItem {
  id: string;
  stepName: string;
  status: 'active' | 'pending' | 'completed';
  startAt: Date;
  endAt: Date;
  duration: number; // minutes
  instructions?: string;
  temperature?: number;
  hydration?: number;
  isOvernight?: boolean; // 8+ hours duration
  isAdaptive?: boolean; // open-ended step
  canOverlap?: boolean; // can run parallel with other steps
  adaptiveCheckInterval?: number; // minutes between readiness checks
}

interface TimelineViewProps {
  items: TimelineItem[];
  now?: Date;
  onMarkDone: (stepId: string) => void;
  onSkip: (stepId: string) => void;
  onOpenRecalibrate: (stepId: string) => void;
  onOpenStepSheet: (stepId: string) => void;
  onSplitOvernightNotification?: (stepId: string, bedtime: Date, wakeup: Date) => void;
  onCheckAdaptiveReadiness?: (stepId: string) => void;
}

export default function TimelineView({
  items,
  now = new Date(),
  onMarkDone,
  onSkip,
  onOpenRecalibrate,
  onOpenStepSheet,
  onSplitOvernightNotification,
  onCheckAdaptiveReadiness
}: TimelineViewProps) {
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const [stepToSkip, setStepToSkip] = useState<TimelineItem | null>(null);

  const formatTimeRange = (start: Date, end: Date, duration: number) => {
    const startTime = format(start, "h:mm a");
    const endTime = format(end, "h:mm a");
    return `${startTime}–${endTime} • ${duration} min`;
  };

  const getDateBadge = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEE"); // Mon, Tue, etc.
  };

  const needsDateBadge = (item: TimelineItem, prevItem?: TimelineItem) => {
    if (!prevItem) return !isToday(item.startAt);
    return !isSameDay(item.startAt, prevItem.startAt);
  };

  const isOvernightStep = (item: TimelineItem) => {
    return item.isOvernight || item.duration >= 480; // 8+ hours
  };

  const getCountdownText = (endAt: Date) => {
    const remaining = endAt.getTime() - now.getTime();
    if (remaining <= 0) return "Time's up";
    
    const minutes = Math.floor(remaining / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} remaining`;
  };

  const handleStepTap = (item: TimelineItem) => {
    if (item.status === 'active') {
      onOpenStepSheet(item.id);
    }
  };

  const handleSwipeRight = (item: TimelineItem) => {
    if (item.status === 'active') {
      // Add haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      onMarkDone(item.id);
    }
  };

  // Group overlapping steps
  const groupedItems = useMemo(() => {
    // Ensure items is an array
    if (!items || !Array.isArray(items)) {
      return [];
    }

    const groups: TimelineItem[][] = [];
    let currentGroup: TimelineItem[] = [];

    items.forEach((item, index) => {
      if (currentGroup.length === 0) {
        currentGroup = [item];
      } else {
        const lastItem = currentGroup[currentGroup.length - 1];
        // Check if this item overlaps with any in current group
        const overlaps = item.canOverlap && 
          item.startAt < lastItem.endAt && 
          item.endAt > lastItem.startAt;

        if (overlaps) {
          currentGroup.push(item);
        } else {
          groups.push([...currentGroup]);
          currentGroup = [item];
        }
      }
    });

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }, [items]);

  return (
    <div className="space-y-3">
      {safeMap(groupedItems, (group, groupIndex) => {
        const isParallel = group.length > 1;
        const prevGroup = groupIndex > 0 ? groupedItems[groupIndex - 1] : undefined;
        const showDateBadge = needsDateBadge(group[0], prevGroup?.[0]);
        
        return (
          <div key={group[0].id}>
            {/* Date badge */}
            {showDateBadge && (
              <div className="flex items-center my-4">
                <div className="flex-1 h-px bg-border" />
                <div className="px-3 py-1 bg-muted text-muted-foreground text-xs font-medium rounded-full mx-3">
                  {getDateBadge(group[0].startAt)}
                  {!isSameDay(group[0].startAt, group[0].endAt) && (
                    <span> → {getDateBadge(group[0].endAt)}</span>
                  )}
                </div>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
            
            {/* Parallel indicator */}
            {isParallel && (
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                <span>Parallel steps</span>
              </div>
            )}
            
            {/* Step rows (stacked if parallel) */}
            <div className={`space-y-2 ${isParallel ? 'pl-2 border-l-2 border-purple-200' : ''}`}>
              {safeMap(group, (item, itemIndex) => {
                const overnight = isOvernightStep(item);
                
                return (
                  <div
                    key={item.id}
                    className={`flex items-center space-x-4 p-3 rounded-lg transition-all duration-200 ${
                      item.status === 'active' 
                        ? 'bg-primary/5 border-l-4 border-primary cursor-pointer hover:bg-primary/10' 
                        : item.status === 'completed'
                        ? 'bg-muted/50 opacity-75'
                        : 'border border-border/50'
                    } ${overnight ? 'border-l-4 border-l-blue-300' : ''} ${
                      isParallel ? 'bg-purple-50/50 border-purple-200' : ''
                    }`}
                    onClick={() => handleStepTap(item)}
          onTouchStart={(e) => {
            // Handle swipe gesture for mobile
            const startX = e.touches[0].clientX;
            const handleTouchEnd = (endEvent: TouchEvent) => {
              const endX = endEvent.changedTouches[0].clientX;
              const deltaX = endX - startX;
              if (deltaX > 100 && item.status === 'active') {
                handleSwipeRight(item);
              }
              document.removeEventListener('touchend', handleTouchEnd);
            };
            document.addEventListener('touchend', handleTouchEnd);
          }}
        >
          {/* Left rail dot */}
          <div className="flex-shrink-0">
            {item.status === 'completed' ? (
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            ) : item.status === 'active' ? (
              <div className="w-6 h-6 rounded-full bg-primary animate-pulse flex items-center justify-center">
                <Clock className="w-3 h-3 text-white" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full border-2 border-border/30" />
            )}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <h4 className={`font-medium flex items-center gap-2 ${
                  item.status === 'active' ? 'text-foreground' 
                  : item.status === 'completed' ? 'text-muted-foreground' 
                  : 'text-muted-foreground'
                }`}>
                  {item.stepName}
                  {overnight && (
                    <Moon className="w-3 h-3 text-blue-500" title="Overnight step" />
                  )}
                  {item.isAdaptive && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                      Adaptive
                    </span>
                  )}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatTimeRange(item.startAt, item.endAt, item.duration)}
                  {item.status === 'active' && (
                    <span className="block text-primary font-medium">
                      {getCountdownText(item.endAt)}
                    </span>
                  )}
                </p>
              </div>

              {/* Right side: Status chip and menu */}
              <div className="flex items-center space-x-2">
                {/* Status chip */}
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  item.status === 'active' 
                    ? 'bg-primary text-primary-foreground' 
                    : item.status === 'completed'
                    ? 'bg-muted text-muted-foreground'
                    : 'border border-border text-muted-foreground'
                }`}>
                  {item.status === 'active' ? 'Active' 
                   : item.status === 'completed' ? 'Done' 
                   : 'Pending'}
                </div>

                {/* Kebab menu */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStep(selectedStep === item.id ? null : item.id);
                  }}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Quick actions menu */}
            {selectedStep === item.id && (
              <div className="mt-2 p-2 bg-background border rounded-md shadow-md">
                <div className="space-y-1">
                  {item.status === 'active' && !item.isAdaptive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8"
                      onClick={() => {
                        onMarkDone(item.id);
                        setSelectedStep(null);
                      }}
                    >
                      Mark Done
                    </Button>
                  )}
                  
                  {item.status === 'active' && item.isAdaptive && onCheckAdaptiveReadiness && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 text-orange-700"
                      onClick={() => {
                        onCheckAdaptiveReadiness(item.id);
                        setSelectedStep(null);
                      }}
                    >
                      <Sun className="w-3 h-3 mr-2" />
                      Check Readiness
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-8"
                    onClick={() => {
                      setStepToSkip(item);
                      setSkipModalOpen(true);
                      setSelectedStep(null);
                    }}
                  >
                    Skip Step
                  </Button>
                  
                  {overnight && item.status === 'pending' && onSplitOvernightNotification && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 text-blue-700"
                      onClick={() => {
                        // Default bedtime 10 PM, wakeup 7 AM
                        // Ensure item.startAt is a valid Date
                        const startDate = item.startAt instanceof Date ? item.startAt : new Date(item.startAt);
                        if (isNaN(startDate.getTime())) {
                          console.error('Invalid startAt date for step:', item.id);
                          return;
                        }
                        
                        const bedtime = new Date(startDate);
                        bedtime.setHours(22, 0, 0, 0);
                        const wakeup = new Date(startDate);
                        wakeup.setDate(wakeup.getDate() + 1);
                        wakeup.setHours(7, 0, 0, 0);
                        
                        onSplitOvernightNotification(item.id, bedtime, wakeup);
                        setSelectedStep(null);
                      }}
                    >
                      <Moon className="w-3 h-3 mr-2" />
                      Split Bedtime/Morning
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-8"
                    onClick={() => {
                      onOpenRecalibrate(item.id);
                      setSelectedStep(null);
                    }}
                  >
                    Recalibrate
                  </Button>
                </div>
              </div>
            )}
          </div>

                    {/* Arrow for active steps */}
                    {item.status === 'active' && (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      
      {/* Skip Confirmation Modal */}
      <SkipConfirmationModal
        isOpen={skipModalOpen}
        stepName={stepToSkip?.stepName || ''}
        stepDuration={stepToSkip?.duration || 0}
        onClose={() => {
          setSkipModalOpen(false);
          setStepToSkip(null);
        }}
        onConfirmSkip={(pullForward) => {
          if (stepToSkip) {
            onSkip(stepToSkip.id);
            // TODO: Apply schedule recalibration based on pullForward flag
            // This would typically trigger a refetch of the timeline with adjusted times
          }
          setSkipModalOpen(false);
          setStepToSkip(null);
        }}
      />
    </div>
  );
}
