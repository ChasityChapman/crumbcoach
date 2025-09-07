import type { Bake, Recipe } from "@shared/schema";
import { formatDistanceToNow, format, addMinutes } from "date-fns";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { safeRecipeQueries, safeTimelineStepQueries, safeBakeQueries } from "@/lib/safeQueries";
import { bakeNotifications } from "@/lib/notifications";
import { timelineAnalytics } from "@/lib/timeline-analytics";
import { safeFind } from "@/lib/safeArray";
import { safeParseDate as utilSafeParseDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MoreVertical, RefreshCw, Pause, CheckCircle, FileText, Thermometer, SkipForward, X } from "lucide-react";
import TimelineView from "./timeline-view";
import RecalibrationSheet from "./recalibration-sheet";
import AdaptiveStepGuide from "./adaptive-step-guide";
import NotificationAnalyticsListener from "./notification-analytics-listener";

interface ActiveBakeCardProps {
  bake: Bake;
  now?: Date;
}

export default function ActiveBakeCard({ bake, now = new Date() }: ActiveBakeCardProps) {
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [recalibrateSheetOpen, setRecalibrateSheetOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [adaptiveGuideOpen, setAdaptiveGuideOpen] = useState(false);
  const [adaptiveStepId, setAdaptiveStepId] = useState<string | null>(null);

  // Get recipe data
  const { data: recipes } = useQuery<Recipe[]>({
    queryKey: ["recipes"],
    queryFn: safeRecipeQueries.getAll,
  });

  // Get timeline steps
  const { data: timelineSteps } = useQuery({
    queryKey: [`bakes`, bake.id, `timeline`],
    queryFn: () => safeTimelineStepQueries.getByBakeId(bake.id),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const recipe = safeFind(recipes, r => r.id === bake.recipeId);

  // Generate schedule from timeline steps
  const timelineItems = useMemo(() => {
    if (!timelineSteps || !Array.isArray(timelineSteps) || timelineSteps.length === 0) return [];

    // Helper function to safely parse dates
    const safeParseDate = (dateValue: any, fallback: Date): Date => {
      if (!dateValue) return fallback;
      try {
        const parsed = utilSafeParseDate(dateValue);
        if (!parsed) return fallback;
        return parsed;
      } catch {
        return fallback;
      }
    };

    return timelineSteps
      .sort((a, b) => (a.stepNumber || 0) - (b.stepNumber || 0))
      .map(step => {
        const stepStartTime = safeParseDate(step.scheduledTime || step.startTime, now);
        const stepEndTime = new Date(stepStartTime.getTime() + (step.estimatedDuration || 30) * 60 * 1000);
        
        return {
          id: step.id,
          stepName: step.title || step.name || `Step ${step.stepNumber}`,
          status: step.status as 'active' | 'pending' | 'completed',
          startAt: stepStartTime,
          endAt: stepEndTime,
          duration: step.estimatedDuration || 30,
          instructions: step.description,
          // Check for overnight steps (8+ hours)
          isOvernight: (step.estimatedDuration || 30) >= 480,
        // Check for adaptive steps (detect by keywords or special flags)
        isAdaptive: step.name?.toLowerCase().includes('until') || 
                   step.name?.toLowerCase().includes('doubled') ||
                   step.name?.toLowerCase().includes('ready') ||
                   step.description?.toLowerCase().includes('until'),
          canOverlap: false, // Could be set based on step type
          adaptiveCheckInterval: 30, // Default 30 minutes
        };
      });
  }, [timelineSteps, now]);

  // Calculate progress
  const completedSteps = timelineItems.filter(item => item.status === 'completed').length;
  const totalSteps = timelineItems.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  // Calculate ETA
  const lastStep = timelineItems[timelineItems.length - 1];
  const eta = lastStep ? lastStep.endAt : addMinutes(utilSafeParseDate(bake.startTime) || now, 480);

  // Get active step for next-step tile
  const activeStep = safeFind(timelineItems, item => item.status === 'active');
  const nextStep = safeFind(timelineItems, item => item.status === 'pending');

  // Schedule notifications for pending steps
  useEffect(() => {
    if (!timelineItems || timelineItems.length === 0) return;

    // Clear all existing alarms first
    bakeNotifications.clearAllAlarms();

    // Schedule alarms for pending steps
    timelineItems.forEach((item) => {
      if (item.status === 'pending') {
        bakeNotifications.scheduleStepAlarms(
          item.id,
          item.stepName,
          item.startAt,
          item.duration,
          bake.id,
          {
            isOvernight: item.isOvernight,
            isAdaptive: item.isAdaptive,
            adaptiveCheckInterval: item.adaptiveCheckInterval,
          }
        );
      }
    });

    // Cleanup on unmount
    return () => {
      bakeNotifications.clearAllAlarms();
    };
  }, [timelineItems, bake.id]);

  // Mutations
  const markDoneMutation = useMutation({
    mutationFn: async (stepId: string) => {
      const step = safeFind(timelineSteps, s => s.id === stepId);
      if (!step) return;

      const startTime = utilSafeParseDate(step.scheduledTime || step.startTime) || now;
      const actualDuration = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
      const estimatedDuration = step.estimatedDuration || 30;
      const delta = actualDuration - estimatedDuration;

      await safeTimelineStepQueries.update(stepId, {
        status: "completed",
        completedTime: now.toISOString(),
        actualDuration,
      });

      // Track step completion analytics
      timelineAnalytics.trackStepComplete({
        bakeId: bake.id,
        stepId: step.id,
        stepName: step.title || step.name || `Step ${step.stepNumber}`,
        stepIndex: step.stepNumber || 0,
        actualDuration,
        estimatedDuration,
        delta,
        completedAt: now,
        wasOverdue: delta > 10 // Consider overdue if >10 minutes late
      });

      // Activate next step
      const nextStep = safeFind(timelineSteps, s => s.stepNumber === (step.stepNumber || 0) + 1);
      if (nextStep) {
        await safeTimelineStepQueries.update(nextStep.id, {
          status: "active",
          startTime: now.toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`bakes`, bake.id, `timeline`] });
      if ('vibrate' in navigator) navigator.vibrate(50);
    },
  });

  const skipStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      const step = safeFind(timelineSteps, s => s.id === stepId);
      if (!step) return;

      await safeTimelineStepQueries.update(stepId, {
        status: "skipped",
        completedTime: now.toISOString(),
      });

      // Track step skip analytics
      timelineAnalytics.trackStepSkip({
        bakeId: bake.id,
        stepId: step.id,
        stepName: step.title || step.name || `Step ${step.stepNumber}`,
        stepIndex: step.stepNumber || 0,
        reason: 'manual',
        pullForward: false, // This would come from skip confirmation modal
        skippedAt: now,
        originalDuration: step.estimatedDuration || 30
      });

      // Activate next step
      const nextStep = safeFind(timelineSteps, s => s.stepNumber === (step.stepNumber || 0) + 1);
      if (nextStep) {
        await safeTimelineStepQueries.update(nextStep.id, {
          status: "active",
          startTime: now.toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`bakes`, bake.id, `timeline`] });
    },
  });

  const pauseBakeMutation = useMutation({
    mutationFn: () => {
      const currentStep = safeFind(timelineSteps, s => s.status === 'active');
      
      // Track pause analytics
      if (currentStep) {
        timelineAnalytics.trackPause({
          bakeId: bake.id,
          currentStepId: currentStep.id,
          currentStepIndex: currentStep.stepNumber || 0,
          pausedAt: now,
          remainingSteps: timelineSteps?.filter(s => s.status === 'pending').length || 0
        });
      }
      
      return safeBakeQueries.update?.(bake.id, { status: "paused" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bakes"] });
    },
  });

  const completeBakeMutation = useMutation({
    mutationFn: () => {
      const completedSteps = timelineSteps?.filter(s => s.status === 'completed').length || 0;
      const skippedSteps = timelineSteps?.filter(s => s.status === 'skipped').length || 0;
      const startTime = utilSafeParseDate(bake.createdAt) || now;
      const actualDuration = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
      
      // Track bake completion analytics
      timelineAnalytics.trackBakeComplete({
        bakeId: bake.id,
        recipeId: bake.recipeId,
        duration: actualDuration,
        estimatedDuration: bake.estimatedDuration || 0,
        stepsCompleted: completedSteps,
        stepsSkipped: skippedSteps,
        timesRecalibrated: 0, // TODO: track this in bake state
        timesPaused: 0, // TODO: track this in bake state  
        endTime: now
      });
      
      return safeBakeQueries.update?.(bake.id, { 
        status: "completed",
        actualEndTime: now.toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bakes"] });
    },
  });

  const deleteBakeMutation = useMutation({
    mutationFn: () => safeBakeQueries.delete(bake.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["bakes"] });
      const previousBakes = queryClient.getQueryData(["bakes"]);
      queryClient.setQueryData(["bakes"], (oldData: any) => {
        if (!oldData || !Array.isArray(oldData)) return [];
        return oldData.filter((b: any) => b.id !== bake.id);
      });
      return { previousBakes };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bakes"] });
    },
    onError: (err, variables, context) => {
      if (context?.previousBakes) {
        queryClient.setQueryData(["bakes"], context.previousBakes);
      }
    },
  });

  const recalibrateMutation = useMutation({
    mutationFn: async (params: { type: 'shift' | 'compress' | 'single'; delta: number; stepId?: string }) => {
      const { type, delta, stepId } = params;
      
      // Track recalibrate open analytics
      const currentStep = safeFind(timelineSteps, s => s.status === 'active');
      timelineAnalytics.trackRecalibrateOpen({
        bakeId: bake.id,
        stepId: currentStep?.id,
        currentStepIndex: currentStep?.stepNumber || 0,
        remainingSteps: timelineSteps?.filter(s => s.status === 'pending').length || 0,
        openedAt: now,
        trigger: 'manual'
      });
      
      let affectedSteps = 0;
      let mode: 'shift_all' | 'from_current' | 'custom_timing' = 'shift_all';
      
      if (type === 'shift') {
        // Shift all remaining steps by delta minutes
        const remainingSteps = timelineSteps?.filter(s => s.status !== 'completed') || [];
        affectedSteps = remainingSteps.length;
        mode = 'shift_all';
        
        for (const step of remainingSteps) {
          const newStartTime = addMinutes(utilSafeParseDate(step.scheduledTime || step.startTime) || now, delta);
          await safeTimelineStepQueries.update(step.id, {
            scheduledTime: newStartTime.toISOString(),
            startTime: step.status === 'active' ? step.startTime : newStartTime.toISOString(),
          });
        }
      } else if (type === 'compress') {
        // Compress gaps between pending steps
        const pendingSteps = timelineSteps?.filter(s => s.status === 'pending') || [];
        affectedSteps = pendingSteps.length;
        mode = 'from_current';
        
        const compressionPerStep = Math.floor(delta / pendingSteps.length);
        let accumulatedCompression = 0;
        
        for (const step of pendingSteps) {
          accumulatedCompression += compressionPerStep;
          const newStartTime = addMinutes(utilSafeParseDate(step.scheduledTime || step.startTime) || now, -accumulatedCompression);
          await safeTimelineStepQueries.update(step.id, {
            scheduledTime: newStartTime.toISOString(),
          });
        }
      } else if (type === 'single' && stepId) {
        // Update single step duration
        affectedSteps = 1;
        mode = 'custom_timing';
        
        const step = safeFind(timelineSteps, s => s.id === stepId);
        if (step) {
          const newDuration = Math.max(1, (step.estimatedDuration || 30) + delta);
          await safeTimelineStepQueries.update(stepId, {
            estimatedDuration: newDuration,
          });
        }
      }
      
      // Track recalibrate apply analytics
      timelineAnalytics.trackRecalibrateApply({
        bakeId: bake.id,
        stepId,
        mode,
        delta,
        affectedSteps,
        appliedAt: now
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`bakes`, bake.id, `timeline`] });
      setRecalibrateSheetOpen(false);
      setSelectedStep(null);
      // Notifications will be rescheduled automatically via the useEffect
      console.log('Timeline recalibrated and notifications rescheduled');
    },
  });

  return (
    <div className="bg-background border rounded-lg shadow-sm" data-active-bake>
      {/* Header pill */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <div className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
            Active bake
          </div>
          <div>
            <h3 className="font-medium text-foreground">{recipe?.name || bake.name}</h3>
            <p className="text-sm text-muted-foreground">
              Started {formatDistanceToNow(utilSafeParseDate(bake.startTime) || now, { addSuffix: true })} • 
              ETA {(() => {
                try {
                  const safeEta = utilSafeParseDate(eta) || new Date();
                  return format(safeEta, 'h:mm a');
                } catch (error) {
                  console.warn('Date formatting error for ETA:', error);
                  return format(new Date(), 'h:mm a');
                }
              })()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRecalibrateSheetOpen(true)}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Recalibrate
          </Button>
          
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOverflowMenu(!showOverflowMenu)}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
            
            {showOverflowMenu && (
              <div className="absolute right-0 top-full mt-1 bg-background border rounded-md shadow-lg py-1 z-10">
                <button
                  className="flex items-center space-x-2 px-4 py-2 text-sm hover:bg-muted w-full text-left"
                  onClick={() => {
                    pauseBakeMutation.mutate();
                    setShowOverflowMenu(false);
                  }}
                >
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </button>
                <button
                  className="flex items-center space-x-2 px-4 py-2 text-sm hover:bg-muted w-full text-left"
                  onClick={() => {
                    completeBakeMutation.mutate();
                    setShowOverflowMenu(false);
                  }}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Complete bake</span>
                </button>
                <button
                  className="flex items-center space-x-2 px-4 py-2 text-sm hover:bg-muted w-full text-left text-destructive"
                  onClick={() => {
                    deleteBakeMutation.mutate();
                    setShowOverflowMenu(false);
                  }}
                >
                  <X className="w-4 h-4" />
                  <span>Delete bake</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{completedSteps}/{totalSteps} steps</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="p-4">
        <TimelineView
          items={timelineItems}
          now={now}
          onMarkDone={(stepId) => markDoneMutation.mutate(stepId)}
          onSkip={(stepId) => skipStepMutation.mutate(stepId)}
          onOpenRecalibrate={(stepId) => {
            setSelectedStep(stepId);
            setRecalibrateSheetOpen(true);
          }}
          onOpenStepSheet={(stepId) => {
            const step = timelineItems.find(item => item.id === stepId);
            if (step?.isAdaptive) {
              setAdaptiveStepId(stepId);
              setAdaptiveGuideOpen(true);
            } else {
              // TODO: Open regular step detail sheet
              console.log('Open step sheet for:', stepId);
            }
          }}
          onSplitOvernightNotification={(stepId, bedtime, wakeup) => {
            const item = timelineItems.find(item => item.id === stepId);
            if (item) {
              bakeNotifications.scheduleStepAlarms(
                stepId,
                item.stepName,
                item.startAt,
                item.duration,
                bake.id,
                {
                  isOvernight: true,
                  bedtime,
                  wakeup,
                }
              );
              console.log(`Split overnight notifications scheduled for ${item.stepName}`);
            }
          }}
          onCheckAdaptiveReadiness={(stepId) => {
            setAdaptiveStepId(stepId);
            setAdaptiveGuideOpen(true);
          }}
        />
      </div>

      {/* Quick actions */}
      <div className="flex space-x-2 p-4 border-t bg-muted/20">
        <Button variant="outline" size="sm" className="flex-1">
          <FileText className="w-4 h-4 mr-1" />
          Add note
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          <Thermometer className="w-4 h-4 mr-1" />
          Adjust temp
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          <SkipForward className="w-4 h-4 mr-1" />
          Skip step
        </Button>
      </div>

      {/* Recalibration Sheet */}
      <RecalibrationSheet
        isOpen={recalibrateSheetOpen}
        onClose={() => {
          setRecalibrateSheetOpen(false);
          setSelectedStep(null);
        }}
        items={timelineItems}
        selectedStepId={selectedStep}
        onApplyRecalibration={(type, delta, stepId) => 
          recalibrateMutation.mutate({ type, delta, stepId })
        }
      />

      {/* Adaptive Step Guide */}
      {adaptiveStepId && (
        <AdaptiveStepGuide
          stepName={timelineItems.find(item => item.id === adaptiveStepId)?.stepName || "Check Readiness"}
          stepDescription={timelineItems.find(item => item.id === adaptiveStepId)?.instructions}
          visualCues={[
            "Dough has increased in size noticeably",
            "Surface appears smooth and slightly domed",
            "Gentle poke test: dough springs back slowly",
            "Sides have pulled away slightly from container"
          ]}
          isOpen={adaptiveGuideOpen}
          onClose={() => {
            setAdaptiveGuideOpen(false);
            setAdaptiveStepId(null);
          }}
          onMarkComplete={() => {
            if (adaptiveStepId) {
              markDoneMutation.mutate(adaptiveStepId);
            }
            setAdaptiveGuideOpen(false);
            setAdaptiveStepId(null);
          }}
          onTakePhoto={() => {
            // TODO: Implement photo capture
            console.log('Taking photo for step:', adaptiveStepId);
            // For now, just close the guide
            setAdaptiveGuideOpen(false);
            setAdaptiveStepId(null);
          }}
        />
      )}

      {/* Notification Analytics Listener */}
      <NotificationAnalyticsListener bakeId={bake.id} />
    </div>
  );
}
