interface TimelineEvent {
  event: string;
  timestamp: Date;
  bakeId: string;
  stepId?: string;
  recipeId?: string;
  properties?: Record<string, any>;
}

interface BakeStartEvent {
  event: 'bake_start';
  bakeId: string;
  recipeId: string;
  recipeName: string;
  totalSteps: number;
  estimatedDurationMinutes: number;
  startTime: Date;
}

interface BakeCompleteEvent {
  event: 'bake_complete';
  bakeId: string;
  recipeId: string;
  duration: number; // actual duration in minutes
  estimatedDuration: number; // original estimate
  stepsCompleted: number;
  stepsSkipped: number;
  timesRecalibrated: number;
  timesPaused: number;
  endTime: Date;
}

interface StepCompleteEvent {
  event: 'step_complete';
  bakeId: string;
  stepId: string;
  stepName: string;
  stepIndex: number;
  actualDuration: number; // minutes
  estimatedDuration: number; // minutes
  delta: number; // actual - estimated
  completedAt: Date;
  wasOverdue: boolean;
}

interface StepSkipEvent {
  event: 'step_skip';
  bakeId: string;
  stepId: string;
  stepName: string;
  stepIndex: number;
  reason?: 'manual' | 'timeout' | 'recalibration';
  pullForward: boolean; // whether user chose to pull earlier steps forward
  skippedAt: Date;
  originalDuration: number;
}

interface StepReopenEvent {
  event: 'step_reopen';
  bakeId: string;
  stepId: string;
  stepName: string;
  stepIndex: number;
  reopenedAt: Date;
  timeSinceCompletion: number; // minutes
}

interface RecalibrateOpenEvent {
  event: 'recalibrate_open';
  bakeId: string;
  stepId?: string;
  currentStepIndex: number;
  remainingSteps: number;
  openedAt: Date;
  trigger: 'manual' | 'missed_notification' | 'timezone_change' | 'resume';
}

interface RecalibrateApplyEvent {
  event: 'recalibrate_apply';
  bakeId: string;
  stepId?: string;
  mode: 'shift_all' | 'from_current' | 'custom_timing';
  delta: number; // minutes adjustment (positive = later, negative = earlier)
  affectedSteps: number;
  appliedAt: Date;
}

interface NotificationTapEvent {
  event: 'notif_tap';
  bakeId: string;
  stepId: string;
  stepName: string;
  notificationType: 't5' | 't0' | 'missed' | 'bedtime' | 'wakeup' | 'adaptive-check';
  tappedAt: Date;
  scheduledTime: Date;
  responseTime: number; // minutes between notification and tap
}

interface NotificationMissedEvent {
  event: 'notif_missed';
  bakeId: string;
  stepId: string;
  stepName: string;
  notificationType: 't5' | 't0' | 'missed' | 'bedtime' | 'wakeup' | 'adaptive-check';
  scheduledTime: Date;
  openedAt: Date;
  delayMinutes: number; // how late they opened the app
}

interface PauseEvent {
  event: 'pause';
  bakeId: string;
  currentStepId: string;
  currentStepIndex: number;
  pausedAt: Date;
  remainingSteps: number;
}

interface ResumeEvent {
  event: 'resume';
  bakeId: string;
  currentStepId: string;
  currentStepIndex: number;
  resumedAt: Date;
  pausedDuration: number; // minutes
  needsRecalibration: boolean;
}

type AnalyticsEvent = 
  | BakeStartEvent 
  | BakeCompleteEvent 
  | StepCompleteEvent 
  | StepSkipEvent 
  | StepReopenEvent 
  | RecalibrateOpenEvent 
  | RecalibrateApplyEvent 
  | NotificationTapEvent 
  | NotificationMissedEvent 
  | PauseEvent 
  | ResumeEvent;

class TimelineAnalytics {
  private events: TimelineEvent[] = [];
  private bakeStates: Map<string, any> = new Map();
  
  constructor() {
    this.loadStoredEvents();
  }

  // Core event tracking
  track(event: AnalyticsEvent): void {
    const timelineEvent: TimelineEvent = {
      event: event.event,
      timestamp: new Date(),
      bakeId: event.bakeId,
      stepId: 'stepId' in event ? event.stepId : undefined,
      recipeId: 'recipeId' in event ? event.recipeId : undefined,
      properties: this.extractProperties(event)
    };

    this.events.push(timelineEvent);
    this.updateBakeState(event);
    this.persistEvents();

    // Send to analytics service (implement based on your needs)
    this.sendToAnalytics(timelineEvent);

    console.log('Timeline Analytics:', timelineEvent);
  }

  // Bake lifecycle events
  trackBakeStart(data: Omit<BakeStartEvent, 'event'>): void {
    this.track({ event: 'bake_start', ...data });
  }

  trackBakeComplete(data: Omit<BakeCompleteEvent, 'event'>): void {
    this.track({ event: 'bake_complete', ...data });
    this.bakeStates.delete(data.bakeId);
  }

  // Step interaction events
  trackStepComplete(data: Omit<StepCompleteEvent, 'event'>): void {
    this.track({ event: 'step_complete', ...data });
  }

  trackStepSkip(data: Omit<StepSkipEvent, 'event'>): void {
    this.track({ event: 'step_skip', ...data });
  }

  trackStepReopen(data: Omit<StepReopenEvent, 'event'>): void {
    this.track({ event: 'step_reopen', ...data });
  }

  // Recalibration events
  trackRecalibrateOpen(data: Omit<RecalibrateOpenEvent, 'event'>): void {
    this.track({ event: 'recalibrate_open', ...data });
  }

  trackRecalibrateApply(data: Omit<RecalibrateApplyEvent, 'event'>): void {
    this.track({ event: 'recalibrate_apply', ...data });
  }

  // Notification events
  trackNotificationTap(data: Omit<NotificationTapEvent, 'event'>): void {
    this.track({ event: 'notif_tap', ...data });
  }

  trackNotificationMissed(data: Omit<NotificationMissedEvent, 'event'>): void {
    this.track({ event: 'notif_missed', ...data });
  }

  // Pause/resume events
  trackPause(data: Omit<PauseEvent, 'event'>): void {
    this.track({ event: 'pause', ...data });
  }

  trackResume(data: Omit<ResumeEvent, 'event'>): void {
    this.track({ event: 'resume', ...data });
  }

  // Analysis methods
  getBakeAnalytics(bakeId: string): any {
    const bakeEvents = this.events.filter(e => e.bakeId === bakeId);
    
    const stepCompletions = bakeEvents.filter(e => e.event === 'step_complete');
    const stepSkips = bakeEvents.filter(e => e.event === 'step_skip');
    const recalibrations = bakeEvents.filter(e => e.event === 'recalibrate_apply');
    const pauses = bakeEvents.filter(e => e.event === 'pause');

    return {
      totalEvents: bakeEvents.length,
      stepsCompleted: stepCompletions.length,
      stepsSkipped: stepSkips.length,
      timesRecalibrated: recalibrations.length,
      timesPaused: pauses.length,
      averageStepDrift: this.calculateAverageStepDrift(bakeId),
      notificationResponseTimes: this.getNotificationResponseTimes(bakeId)
    };
  }

  getRecipeAnalytics(recipeId: string): any {
    const recipeEvents = this.events.filter(e => e.recipeId === recipeId);
    const bakeIds = [...new Set(recipeEvents.map(e => e.bakeId))];

    const completionRates = bakeIds.map(bakeId => {
      const bakeEvents = this.events.filter(e => e.bakeId === bakeId);
      const completed = bakeEvents.filter(e => e.event === 'step_complete').length;
      const skipped = bakeEvents.filter(e => e.event === 'step_skip').length;
      const total = completed + skipped;
      return total > 0 ? completed / total : 0;
    });

    const stepDrifts = this.getStepDriftsByRecipe(recipeId);

    return {
      totalBakes: bakeIds.length,
      averageCompletionRate: completionRates.reduce((a, b) => a + b, 0) / completionRates.length || 0,
      stepDrifts,
      problematicSteps: this.getProblematicSteps(recipeId)
    };
  }

  // Private methods
  private extractProperties(event: any): Record<string, any> {
    const { event: eventType, ...properties } = event;
    return properties;
  }

  private updateBakeState(event: AnalyticsEvent): void {
    const state = this.bakeStates.get(event.bakeId) || {
      startTime: null,
      currentStep: 0,
      stepsCompleted: 0,
      stepsSkipped: 0,
      recalibrations: 0,
      pauses: 0,
      isPaused: false
    };

    switch (event.event) {
      case 'bake_start':
        state.startTime = new Date();
        break;
      case 'step_complete':
        state.stepsCompleted++;
        state.currentStep++;
        break;
      case 'step_skip':
        state.stepsSkipped++;
        state.currentStep++;
        break;
      case 'recalibrate_apply':
        state.recalibrations++;
        break;
      case 'pause':
        state.pauses++;
        state.isPaused = true;
        break;
      case 'resume':
        state.isPaused = false;
        break;
    }

    this.bakeStates.set(event.bakeId, state);
  }

  private calculateAverageStepDrift(bakeId: string): number {
    const completions = this.events.filter(e => 
      e.bakeId === bakeId && e.event === 'step_complete'
    );

    if (completions.length === 0) return 0;

    const totalDrift = completions.reduce((sum, event) => {
      return sum + (event.properties?.delta || 0);
    }, 0);

    return totalDrift / completions.length;
  }

  private getNotificationResponseTimes(bakeId: string): number[] {
    return this.events
      .filter(e => e.bakeId === bakeId && e.event === 'notif_tap')
      .map(e => e.properties?.responseTime || 0);
  }

  private getStepDriftsByRecipe(recipeId: string): Record<string, number> {
    const completions = this.events.filter(e => 
      e.recipeId === recipeId && e.event === 'step_complete'
    );

    const driftsByStep: Record<string, number[]> = {};

    completions.forEach(event => {
      const stepName = event.properties?.stepName || 'unknown';
      if (!driftsByStep[stepName]) {
        driftsByStep[stepName] = [];
      }
      driftsByStep[stepName].push(event.properties?.delta || 0);
    });

    // Return average drift for each step
    const averageDrifts: Record<string, number> = {};
    Object.entries(driftsByStep).forEach(([stepName, drifts]) => {
      averageDrifts[stepName] = drifts.reduce((a, b) => a + b, 0) / drifts.length;
    });

    return averageDrifts;
  }

  private getProblematicSteps(recipeId: string): Array<{ stepName: string, averageDrift: number, skipRate: number }> {
    const stepEvents = this.events.filter(e => e.recipeId === recipeId);
    const stepStats: Record<string, { completions: number, skips: number, totalDrift: number }> = {};

    stepEvents.forEach(event => {
      const stepName = event.properties?.stepName || 'unknown';
      
      if (!stepStats[stepName]) {
        stepStats[stepName] = { completions: 0, skips: 0, totalDrift: 0 };
      }

      if (event.event === 'step_complete') {
        stepStats[stepName].completions++;
        stepStats[stepName].totalDrift += event.properties?.delta || 0;
      } else if (event.event === 'step_skip') {
        stepStats[stepName].skips++;
      }
    });

    return Object.entries(stepStats)
      .map(([stepName, stats]) => ({
        stepName,
        averageDrift: stats.completions > 0 ? stats.totalDrift / stats.completions : 0,
        skipRate: (stats.completions + stats.skips) > 0 ? stats.skips / (stats.completions + stats.skips) : 0
      }))
      .filter(step => Math.abs(step.averageDrift) > 10 || step.skipRate > 0.2) // Problematic if >10min drift or >20% skip rate
      .sort((a, b) => Math.abs(b.averageDrift) - Math.abs(a.averageDrift));
  }

  private loadStoredEvents(): void {
    try {
      const stored = localStorage.getItem('timeline-analytics-events');
      if (stored) {
        const events = JSON.parse(stored);
        this.events = events.map((e: any) => ({
          ...e,
          timestamp: new Date(e.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load stored analytics events:', error);
    }
  }

  private persistEvents(): void {
    try {
      // Keep only last 1000 events to avoid storage bloat
      const recentEvents = this.events.slice(-1000);
      localStorage.setItem('timeline-analytics-events', JSON.stringify(recentEvents));
    } catch (error) {
      console.error('Failed to persist analytics events:', error);
    }
  }

  private sendToAnalytics(event: TimelineEvent): void {
    // Implement your analytics service integration here
    // Examples: Google Analytics, PostHog, Mixpanel, custom API
    
    // For now, just store locally
    // In production, you might send to your analytics endpoint:
    /*
    fetch('/api/analytics/timeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    }).catch(err => console.warn('Analytics send failed:', err));
    */
  }

  // Utility methods
  clearEvents(): void {
    this.events = [];
    this.bakeStates.clear();
    localStorage.removeItem('timeline-analytics-events');
  }

  exportEvents(): TimelineEvent[] {
    return [...this.events];
  }

  getEventsSummary(): any {
    const summary = {
      totalEvents: this.events.length,
      eventTypes: {} as Record<string, number>,
      activeBakes: this.bakeStates.size,
      dateRange: {
        first: this.events.length > 0 ? this.events[0].timestamp : null,
        last: this.events.length > 0 ? this.events[this.events.length - 1].timestamp : null
      }
    };

    this.events.forEach(event => {
      summary.eventTypes[event.event] = (summary.eventTypes[event.event] || 0) + 1;
    });

    return summary;
  }
}

export const timelineAnalytics = new TimelineAnalytics();