interface ScheduledNotification {
  id: string;
  stepName: string;
  scheduledTime: Date;
  type: 'start' | 'end' | 'bedtime' | 'wakeup' | 'adaptive';
  bakeId: string;
  isActive: boolean;
}

// Import will be added dynamically to avoid circular imports
declare const timelineAnalytics: any;

export class BakeNotifications {
  private static instance: BakeNotifications;
  private alarms: Map<string, NodeJS.Timeout> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private scheduledNotifications: Map<string, ScheduledNotification> = new Map();
  private permission: NotificationPermission = "default";
  private registration: ServiceWorkerRegistration | null = null;
  private isServiceWorkerSupported = 'serviceWorker' in navigator;
  private lastKnownTimezone: string;
  private timezoneCheckInterval: NodeJS.Timeout | null = null;
  private dndCheckInterval: NodeJS.Timeout | null = null;
  private isDoNotDisturbActive: boolean = false;

  private constructor() {
    this.lastKnownTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.checkPermission();
    this.registerServiceWorker();
    this.loadScheduledNotifications();
    this.reconcileNotifications();
    this.startTimezoneMonitoring();
    this.startDoNotDisturbMonitoring();
  }

  public static getInstance(): BakeNotifications {
    if (!BakeNotifications.instance) {
      BakeNotifications.instance = new BakeNotifications();
    }
    return BakeNotifications.instance;
  }

  private async checkPermission(): Promise<void> {
    if ("Notification" in window) {
      this.permission = Notification.permission;
      if (this.permission === "default") {
        this.permission = await Notification.requestPermission();
      }
    }
  }

  public async requestPermission(): Promise<boolean> {
    if ("Notification" in window) {
      this.permission = await Notification.requestPermission();
      
      // Also request persistent notification permission for mobile
      if (this.registration && 'showNotification' in this.registration) {
        console.log('Push notifications supported via service worker');
      }
      
      return this.permission === "granted";
    }
    return false;
  }

  public scheduleStepAlarms(
    stepId: string,
    stepName: string,
    startTime: Date,
    duration: number, // minutes
    bakeId: string,
    options?: {
      isOvernight?: boolean;
      bedtime?: Date;
      wakeup?: Date;
      isAdaptive?: boolean;
      adaptiveCheckInterval?: number;
    }
  ): void {
    // Debounce rapid edits (500ms as specified)
    const debounceKey = `${stepId}-schedule`;
    const existingDebounce = this.debounceTimers.get(debounceKey);
    if (existingDebounce) {
      clearTimeout(existingDebounce);
    }

    const debounceTimer = setTimeout(() => {
      this.scheduleStepAlarmsImmediate(stepId, stepName, startTime, duration, bakeId, options);
      this.debounceTimers.delete(debounceKey);
    }, 500);

    this.debounceTimers.set(debounceKey, debounceTimer);
  }

  private scheduleStepAlarmsImmediate(
    stepId: string,
    stepName: string,
    startTime: Date,
    duration: number,
    bakeId: string,
    options?: {
      isOvernight?: boolean;
      bedtime?: Date;
      wakeup?: Date;
      isAdaptive?: boolean;
      adaptiveCheckInterval?: number;
    }
  ): void {
    // Clear existing alarms for this step
    this.clearAlarm(stepId);

    const now = new Date();
    
    if (options?.isOvernight && options.bedtime && options.wakeup) {
      // Split overnight notifications
      this.scheduleOvernightNotifications(stepId, stepName, startTime, duration, bakeId, options.bedtime, options.wakeup);
    } else if (options?.isAdaptive) {
      // Adaptive step notifications
      this.scheduleAdaptiveNotifications(stepId, stepName, startTime, duration, bakeId, options.adaptiveCheckInterval || 30);
    } else {
      // Standard T-5 and T0 notifications
      const t5Time = new Date(startTime.getTime() - 5 * 60 * 1000); // 5 minutes before
      const t0Time = startTime; // Exact start time

      // Schedule T-5 notification (5 minutes before)
      const timeUntilT5 = t5Time.getTime() - now.getTime();
      if (timeUntilT5 > 0) {
        const t5TimeoutId = setTimeout(() => {
          this.triggerT5Notification(stepName, duration, bakeId);
          this.alarms.delete(`${stepId}-t5`);
        }, timeUntilT5);
        
        this.alarms.set(`${stepId}-t5`, t5TimeoutId);
        console.log(`Scheduled T-5 notification for "${stepName}" in ${Math.round(timeUntilT5 / 1000 / 60)} minutes`);
      }

      // Schedule T0 notification (exact start time)
      const timeUntilT0 = t0Time.getTime() - now.getTime();
      if (timeUntilT0 > 0) {
        const t0TimeoutId = setTimeout(() => {
          this.triggerT0Notification(stepName, bakeId);
          this.alarms.delete(stepId);
          this.removeNotification(stepId);
        }, timeUntilT0);

        this.alarms.set(stepId, t0TimeoutId);
        this.trackNotification(stepId, stepName, t0Time, 'start', bakeId);
        console.log(`Scheduled T0 notification for "${stepName}" in ${Math.round(timeUntilT0 / 1000 / 60)} minutes`);
      }
    }

    // Schedule missed notification check (10+ minutes late)
    const missedCheckTime = new Date(startTime.getTime() + 10 * 60 * 1000);
    const timeUntilMissedCheck = missedCheckTime.getTime() - now.getTime();
    if (timeUntilMissedCheck > 0) {
      const missedTimeoutId = setTimeout(() => {
        this.triggerMissedNotification(stepName, bakeId);
        this.alarms.delete(`${stepId}-missed`);
      }, timeUntilMissedCheck);

      this.alarms.set(`${stepId}-missed`, missedTimeoutId);
    }
  }

  private scheduleOvernightNotifications(
    stepId: string,
    stepName: string,
    startTime: Date,
    duration: number,
    bakeId: string,
    bedtime: Date,
    wakeup: Date
  ): void {
    const now = new Date();

    // Bedtime notification
    const timeUntilBedtime = bedtime.getTime() - now.getTime();
    if (timeUntilBedtime > 0) {
      const bedtimeTimeoutId = setTimeout(() => {
        this.triggerBedtimeNotification(stepName, wakeup, bakeId);
        this.alarms.delete(`${stepId}-bedtime`);
        this.removeNotification(`${stepId}-bedtime`);
      }, timeUntilBedtime);
      
      this.alarms.set(`${stepId}-bedtime`, bedtimeTimeoutId);
      this.trackNotification(`${stepId}-bedtime`, stepName, bedtime, 'bedtime', bakeId);
      console.log(`Scheduled bedtime notification for "${stepName}" in ${Math.round(timeUntilBedtime / 1000 / 60)} minutes`);
    }

    // Morning notification
    const timeUntilWakeup = wakeup.getTime() - now.getTime();
    if (timeUntilWakeup > 0) {
      const wakeupTimeoutId = setTimeout(() => {
        this.triggerWakeupNotification(stepName, bakeId);
        this.alarms.delete(`${stepId}-wakeup`);
        this.removeNotification(`${stepId}-wakeup`);
      }, timeUntilWakeup);

      this.alarms.set(`${stepId}-wakeup`, wakeupTimeoutId);
      this.trackNotification(`${stepId}-wakeup`, stepName, wakeup, 'wakeup', bakeId);
      console.log(`Scheduled wakeup notification for "${stepName}" in ${Math.round(timeUntilWakeup / 1000 / 60)} minutes`);
    }
  }

  private scheduleAdaptiveNotifications(
    stepId: string,
    stepName: string,
    startTime: Date,
    duration: number,
    bakeId: string,
    checkInterval: number
  ): void {
    const now = new Date();

    // Initial T0 notification
    const timeUntilT0 = startTime.getTime() - now.getTime();
    if (timeUntilT0 > 0) {
      const t0TimeoutId = setTimeout(() => {
        this.triggerAdaptiveStartNotification(stepName, bakeId);
        this.scheduleAdaptiveChecks(stepId, stepName, bakeId, checkInterval);
        this.alarms.delete(stepId);
        this.removeNotification(stepId);
      }, timeUntilT0);

      this.alarms.set(stepId, t0TimeoutId);
      this.trackNotification(stepId, stepName, startTime, 'adaptive', bakeId);
      console.log(`Scheduled adaptive start notification for "${stepName}" in ${Math.round(timeUntilT0 / 1000 / 60)} minutes`);
    }
  }

  private scheduleAdaptiveChecks(
    stepId: string,
    stepName: string,
    bakeId: string,
    checkInterval: number
  ): void {
    let checkCount = 1;
    
    const scheduleNextCheck = () => {
      const checkTimeoutId = setTimeout(() => {
        this.triggerAdaptiveCheckNotification(stepName, checkCount, bakeId);
        checkCount++;
        
        // Schedule next check
        this.alarms.delete(`${stepId}-check${checkCount - 1}`);
        scheduleNextCheck();
      }, checkInterval * 60 * 1000);

      this.alarms.set(`${stepId}-check${checkCount}`, checkTimeoutId);
    };

    scheduleNextCheck();
  }

  // Legacy method for compatibility
  public scheduleStepAlarm(
    stepId: string,
    stepName: string,
    triggerTime: Date,
    bakeId: string
  ): void {
    this.scheduleStepAlarms(stepId, stepName, triggerTime, 30, bakeId);
  }

  private async triggerT5Notification(stepName: string, duration: number, bakeId: string): Promise<void> {
    if (this.permission !== "granted") return;

    const notificationData = {
      title: '🍞 Next Step Coming Up',
      body: `Next: ${stepName} in 5 min (${duration} min).`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `bake-${bakeId}-t5`,
      requireInteraction: false, // T-5 is just a heads up
      vibrate: [100], // Gentle vibration
      silent: false,
      data: { stepName, bakeId, type: 't5' }
    };

    await this.sendNotification(notificationData);
  }

  private async triggerT0Notification(stepName: string, bakeId: string): Promise<void> {
    if (this.permission !== "granted") return;

    const notificationData = {
      title: '🍞 Time for Next Step!',
      body: `${stepName} now • Tap for instructions.`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `bake-${bakeId}-t0`,
      requireInteraction: true, // T0 requires action
      vibrate: [200, 100, 200], // Strong vibration pattern
      silent: false,
      data: { stepName, bakeId, type: 't0' }
    };

    await this.sendNotification(notificationData);
    this.playAlertSound(); // Only play sound for T0
  }

  private async triggerMissedNotification(stepName: string, bakeId: string): Promise<void> {
    if (this.permission !== "granted") return;

    const notificationData = {
      title: '⏰ Step Overdue',
      body: `${stepName} is overdue. Open to recalibrate your timeline.`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `bake-${bakeId}-missed`,
      requireInteraction: true,
      vibrate: [300, 200, 300], // Urgent vibration
      silent: false,
      data: { stepName, bakeId, type: 'missed' }
    };

    await this.sendNotification(notificationData);
  }

  private async triggerBedtimeNotification(stepName: string, wakeup: Date, bakeId: string): Promise<void> {
    if (this.permission !== "granted") return;

    const wakeupTime = wakeup.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const notificationData = {
      title: '🌙 Bedtime Reminder',
      body: `${stepName} is fermenting overnight. Sweet dreams! Wake up at ${wakeupTime} to check.`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `bake-${bakeId}-bedtime`,
      requireInteraction: false,
      vibrate: [100, 100], // Gentle vibration
      silent: false,
      data: { stepName, bakeId, type: 'bedtime' }
    };

    await this.sendNotification(notificationData);
  }

  private async triggerWakeupNotification(stepName: string, bakeId: string): Promise<void> {
    if (this.permission !== "granted") return;

    const notificationData = {
      title: '🌅 Good Morning!',
      body: `Time to check on your ${stepName}. Your dough should be ready.`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `bake-${bakeId}-wakeup`,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200], // Energetic morning vibration
      silent: false,
      data: { stepName, bakeId, type: 'wakeup' }
    };

    await this.sendNotification(notificationData);
    this.playAlertSound(); // Play sound for morning wakeup
  }

  private async triggerAdaptiveStartNotification(stepName: string, bakeId: string): Promise<void> {
    if (this.permission !== "granted") return;

    const notificationData = {
      title: '🔄 Adaptive Step Started',
      body: `${stepName} started. Check readiness when it looks ready - no fixed timing!`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `bake-${bakeId}-adaptive-start`,
      requireInteraction: true,
      vibrate: [200, 100, 200], // Standard vibration
      silent: false,
      data: { stepName, bakeId, type: 'adaptive-start' }
    };

    await this.sendNotification(notificationData);
    this.playAlertSound();
  }

  private async triggerAdaptiveCheckNotification(stepName: string, checkCount: number, bakeId: string): Promise<void> {
    if (this.permission !== "granted") return;

    const notificationData = {
      title: '👀 Ready Check',
      body: `Check ${stepName} progress (reminder #${checkCount}). Ready? Tap to mark complete.`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `bake-${bakeId}-adaptive-check`,
      requireInteraction: false, // Don't force interaction for periodic checks
      vibrate: [100], // Gentle nudge
      silent: false,
      data: { stepName, bakeId, type: 'adaptive-check' }
    };

    await this.sendNotification(notificationData);
  }

  // Legacy method for compatibility
  private async triggerStepNotification(stepName: string, bakeId: string): Promise<void> {
    return this.triggerT0Notification(stepName, bakeId);
  }

  private async sendNotification(notificationData: any): Promise<void> {
    // Check if DND is active - if so, send in-app notification instead
    if (this.isDoNotDisturbActive) {
      this.sendInAppNotification(notificationData);
      return;
    }

    // Use service worker for persistent notifications (better for mobile)
    if (this.registration && 'showNotification' in this.registration) {
      try {
        await this.registration.showNotification(notificationData.title, {
          body: notificationData.body,
          icon: notificationData.icon,
          badge: notificationData.badge,
          tag: notificationData.tag,
          requireInteraction: notificationData.requireInteraction,
          data: notificationData.data,
        });
        console.log(`${notificationData.data.type} notification sent via service worker`);
      } catch (error) {
        console.log('Service worker notification failed, falling back to regular notification:', error);
        this.showRegularNotification(notificationData);
      }
    } else {
      // Fallback to regular notification
      this.showRegularNotification(notificationData);
    }

    // Custom event for UI components to listen to
    window.dispatchEvent(new CustomEvent('bake-step-alarm', {
      detail: { 
        stepName: notificationData.data.stepName, 
        bakeId: notificationData.data.bakeId,
        type: notificationData.data.type 
      }
    }));
  }

  private playAlertSound(): void {
    try {
      // Create a pleasant baking timer sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a pleasant bell-like sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log("Could not play alert sound:", error);
    }
  }

  public clearAlarm(stepId: string): void {
    // Clear main alarm
    const timeoutId = this.alarms.get(stepId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.alarms.delete(stepId);
    }

    // Clear T-5 alarm
    const t5TimeoutId = this.alarms.get(`${stepId}-t5`);
    if (t5TimeoutId) {
      clearTimeout(t5TimeoutId);
      this.alarms.delete(`${stepId}-t5`);
    }

    // Clear missed alarm
    const missedTimeoutId = this.alarms.get(`${stepId}-missed`);
    if (missedTimeoutId) {
      clearTimeout(missedTimeoutId);
      this.alarms.delete(`${stepId}-missed`);
    }
  }

  public clearAllAlarms(): void {
    this.alarms.forEach((timeoutId) => clearTimeout(timeoutId));
    this.alarms.clear();
  }

  public getScheduledAlarms(): string[] {
    return Array.from(this.alarms.keys());
  }

  private showRegularNotification(data: any): void {
    const notification = new Notification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      requireInteraction: data.requireInteraction
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto-close after 30 seconds
    setTimeout(() => notification.close(), 30000);
  }

  private async registerServiceWorker(): Promise<void> {
    if (!this.isServiceWorkerSupported) {
      console.log('Service Worker not supported');
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('Service Worker registered successfully');
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('Service Worker ready for notifications');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  public async getMobileNotificationSupport(): Promise<boolean> {
    return this.isServiceWorkerSupported && 
           this.registration !== null && 
           'showNotification' in (this.registration || {});
  }

  public hasPermission(): boolean {
    return this.permission === "granted";
  }

  // App restoration and notification reconciliation methods
  private loadScheduledNotifications(): void {
    try {
      const stored = localStorage.getItem('scheduledNotifications');
      if (stored) {
        const notifications = JSON.parse(stored);
        Object.entries(notifications).forEach(([id, notification]: [string, any]) => {
          this.scheduledNotifications.set(id, {
            ...notification,
            scheduledTime: new Date(notification.scheduledTime)
          });
        });
        console.log(`Loaded ${this.scheduledNotifications.size} scheduled notifications from storage`);
      }
    } catch (error) {
      console.error('Failed to load scheduled notifications:', error);
    }
  }

  private saveScheduledNotifications(): void {
    try {
      const notificationsObj = Object.fromEntries(this.scheduledNotifications);
      localStorage.setItem('scheduledNotifications', JSON.stringify(notificationsObj));
    } catch (error) {
      console.error('Failed to save scheduled notifications:', error);
    }
  }

  private reconcileNotifications(): void {
    console.log('Reconciling notifications after app restoration...');
    const now = new Date();
    let reconciledCount = 0;
    let expiredCount = 0;

    this.scheduledNotifications.forEach((notification, id) => {
      const timeDiff = notification.scheduledTime.getTime() - now.getTime();
      
      if (timeDiff < -30 * 60 * 1000) {
        // Notification is more than 30 minutes overdue - remove it
        this.scheduledNotifications.delete(id);
        expiredCount++;
      } else if (timeDiff <= 0) {
        // Notification should have fired - send it now
        this.sendMissedNotificationImmediate(notification);
        this.scheduledNotifications.delete(id);
        reconciledCount++;
      } else if (notification.isActive) {
        // Reschedule future notification
        this.rescheduleNotification(notification);
        reconciledCount++;
      }
    });

    this.saveScheduledNotifications();
    
    if (reconciledCount > 0 || expiredCount > 0) {
      console.log(`Reconciliation complete: ${reconciledCount} rescheduled, ${expiredCount} expired`);
      
      // Dispatch event for UI to show restoration banner
      window.dispatchEvent(new CustomEvent('notifications-reconciled', {
        detail: { rescheduled: reconciledCount, expired: expiredCount }
      }));
    }
  }

  private async sendMissedNotificationImmediate(notification: ScheduledNotification): Promise<void> {
    if (this.permission !== "granted") return;

    const minutesLate = Math.round((new Date().getTime() - notification.scheduledTime.getTime()) / (1000 * 60));
    
    const notificationData = {
      title: '📱 App Restored - Missed Alert',
      body: `Missed: ${notification.stepName} (${minutesLate}m ago). Open to recalibrate your timeline.`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `restore-${notification.bakeId}`,
      requireInteraction: true,
      vibrate: [300, 100, 300],
      silent: false,
      data: { 
        stepName: notification.stepName, 
        bakeId: notification.bakeId, 
        type: 'missed-restore',
        originalType: notification.type
      }
    };

    await this.sendNotification(notificationData);
  }

  private rescheduleNotification(notification: ScheduledNotification): void {
    const now = new Date();
    const delay = notification.scheduledTime.getTime() - now.getTime();
    
    if (delay > 0) {
      const timeoutId = setTimeout(() => {
        this.executeScheduledNotification(notification);
        this.scheduledNotifications.delete(notification.id);
        this.alarms.delete(notification.id);
        this.saveScheduledNotifications();
      }, delay);
      
      this.alarms.set(notification.id, timeoutId);
      console.log(`Rescheduled ${notification.type} notification for "${notification.stepName}" in ${Math.round(delay / 1000 / 60)} minutes`);
    }
  }

  private async executeScheduledNotification(notification: ScheduledNotification): Promise<void> {
    switch (notification.type) {
      case 'start':
        await this.triggerT0Notification(notification.stepName, notification.bakeId);
        break;
      case 'end':
        await this.triggerMissedNotification(notification.stepName, notification.bakeId);
        break;
      case 'bedtime':
        await this.triggerBedtimeNotification(notification.stepName, new Date(), notification.bakeId);
        break;
      case 'wakeup':
        await this.triggerWakeupNotification(notification.stepName, notification.bakeId);
        break;
      case 'adaptive':
        await this.triggerAdaptiveStartNotification(notification.stepName, notification.bakeId);
        break;
    }
  }

  public trackNotification(
    id: string,
    stepName: string,
    scheduledTime: Date,
    type: 'start' | 'end' | 'bedtime' | 'wakeup' | 'adaptive',
    bakeId: string
  ): void {
    const notification: ScheduledNotification = {
      id,
      stepName,
      scheduledTime,
      type,
      bakeId,
      isActive: true
    };
    
    this.scheduledNotifications.set(id, notification);
    this.saveScheduledNotifications();
  }

  public removeNotification(id: string): void {
    this.scheduledNotifications.delete(id);
    this.saveScheduledNotifications();
  }

  public getPendingNotifications(): ScheduledNotification[] {
    return Array.from(this.scheduledNotifications.values())
      .filter(n => n.isActive && n.scheduledTime > new Date());
  }

  // Timezone monitoring methods
  private startTimezoneMonitoring(): void {
    // Check timezone every 5 minutes
    this.timezoneCheckInterval = setInterval(() => {
      this.checkTimezoneChange();
    }, 5 * 60 * 1000);

    // Also check on page visibility change (mobile users switching apps/resuming)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        setTimeout(() => this.checkTimezoneChange(), 1000);
      }
    });
  }

  private checkTimezoneChange(): void {
    const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    if (currentTimezone !== this.lastKnownTimezone) {
      console.log(`Timezone change detected: ${this.lastKnownTimezone} → ${currentTimezone}`);
      
      const previousTz = this.lastKnownTimezone;
      this.lastKnownTimezone = currentTimezone;
      
      // Store timezone change info
      localStorage.setItem('lastTimezoneChange', JSON.stringify({
        from: previousTz,
        to: currentTimezone,
        detectedAt: new Date().toISOString()
      }));
      
      this.handleTimezoneChange(previousTz, currentTimezone);
    }
  }

  private async handleTimezoneChange(fromTz: string, toTz: string): Promise<void> {
    const pendingNotifications = this.getPendingNotifications();
    
    if (pendingNotifications.length === 0) {
      return; // No active bakes to worry about
    }

    // Send immediate warning notification
    await this.sendTimezoneChangeNotification(fromTz, toTz, pendingNotifications.length);
    
    // Dispatch event for UI components
    window.dispatchEvent(new CustomEvent('timezone-change-detected', {
      detail: {
        from: fromTz,
        to: toTz,
        pendingNotifications: pendingNotifications.length,
        notifications: pendingNotifications
      }
    }));
  }

  private async sendTimezoneChangeNotification(
    fromTz: string, 
    toTz: string, 
    notificationCount: number
  ): Promise<void> {
    if (this.permission !== "granted") return;

    const fromLocation = fromTz.split('/').pop()?.replace(/_/g, ' ') || fromTz;
    const toLocation = toTz.split('/').pop()?.replace(/_/g, ' ') || toTz;

    const notificationData = {
      title: '🌍 Timezone Change Detected',
      body: `Moved from ${fromLocation} to ${toLocation}? ${notificationCount} bake timer(s) may need adjustment.`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'timezone-change',
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      silent: false,
      data: { 
        type: 'timezone-change',
        from: fromTz,
        to: toTz,
        notificationCount
      }
    };

    await this.sendNotification(notificationData);
  }

  public getTimezoneChangeInfo(): { from: string; to: string; detectedAt: string } | null {
    try {
      const stored = localStorage.getItem('lastTimezoneChange');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  public clearTimezoneChangeInfo(): void {
    localStorage.removeItem('lastTimezoneChange');
  }

  public destroy(): void {
    if (this.timezoneCheckInterval) {
      clearInterval(this.timezoneCheckInterval);
      this.timezoneCheckInterval = null;
    }
    if (this.dndCheckInterval) {
      clearInterval(this.dndCheckInterval);
      this.dndCheckInterval = null;
    }
    this.clearAllAlarms();
  }

  // Do Not Disturb detection methods
  private startDoNotDisturbMonitoring(): void {
    // Check DND status every 30 seconds
    this.dndCheckInterval = setInterval(() => {
      this.checkDoNotDisturbStatus();
    }, 30 * 1000);

    // Initial check
    this.checkDoNotDisturbStatus();
  }

  private checkDoNotDisturbStatus(): void {
    // Heuristic: Check if we're in a quiet hours period (typically 9 PM - 7 AM)
    const now = new Date();
    const hour = now.getHours();
    const isQuietHours = hour >= 21 || hour <= 7;

    // Check if notification permission exists but browser might be silencing
    const likelyDndActive = isQuietHours && this.permission === "granted";

    // Additional check: On mobile, certain webkit properties can indicate DND
    const hasMobileIndicators = 'webkitNotifications' in window && 
      window.matchMedia('(display-mode: standalone)').matches;

    const wasDndActive = this.isDoNotDisturbActive;
    this.isDoNotDisturbActive = likelyDndActive || hasMobileIndicators;

    // If DND status changed, notify UI
    if (wasDndActive !== this.isDoNotDisturbActive) {
      window.dispatchEvent(new CustomEvent('dnd-status-changed', {
        detail: { 
          isDndActive: this.isDoNotDisturbActive,
          reason: isQuietHours ? 'quiet-hours' : hasMobileIndicators ? 'mobile-dnd' : 'unknown'
        }
      }));
      
      console.log(`Do Not Disturb status changed: ${this.isDoNotDisturbActive ? 'active' : 'inactive'}`);
    }
  }

  private sendInAppNotification(notificationData: any): void {
    // Send in-app banner event instead of system notification
    window.dispatchEvent(new CustomEvent('in-app-notification', {
      detail: {
        title: notificationData.title,
        body: notificationData.body,
        type: notificationData.data.type,
        stepName: notificationData.data.stepName,
        bakeId: notificationData.data.bakeId,
        requireInteraction: notificationData.requireInteraction,
        timestamp: new Date().toISOString()
      }
    }));

    // Still play alert sound if it's an important notification
    if (notificationData.requireInteraction || 
        notificationData.data.type === 't0' || 
        notificationData.data.type === 'missed') {
      this.playAlertSound();
    }

    console.log(`In-app notification sent: ${notificationData.data.type} for "${notificationData.data.stepName}"`);
  }

  public getDoNotDisturbStatus(): boolean {
    return this.isDoNotDisturbActive;
  }
}

export const bakeNotifications = BakeNotifications.getInstance();