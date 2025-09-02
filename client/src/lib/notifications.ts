export class BakeNotifications {
  private static instance: BakeNotifications;
  private alarms: Map<string, NodeJS.Timeout> = new Map();
  private permission: NotificationPermission = "default";
  private registration: ServiceWorkerRegistration | null = null;
  private isServiceWorkerSupported = 'serviceWorker' in navigator;

  private constructor() {
    this.checkPermission();
    this.registerServiceWorker();
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

  public scheduleStepAlarm(
    stepId: string,
    stepName: string,
    triggerTime: Date,
    bakeId: string
  ): void {
    // Clear existing alarm for this step if any
    this.clearAlarm(stepId);

    const now = new Date();
    const timeUntilAlarm = triggerTime.getTime() - now.getTime();

    // Don't schedule alarms for past times
    if (timeUntilAlarm <= 0) {
      return;
    }

    // Schedule the alarm
    const timeoutId = setTimeout(() => {
      this.triggerStepNotification(stepName, bakeId);
      this.alarms.delete(stepId);
    }, timeUntilAlarm);

    this.alarms.set(stepId, timeoutId);
    
    console.log(`Scheduled alarm for "${stepName}" in ${Math.round(timeUntilAlarm / 1000 / 60)} minutes`);
  }

  private async triggerStepNotification(stepName: string, bakeId: string): Promise<void> {
    if (this.permission !== "granted") return;

    const notificationData = {
      title: '🍞 Baking Step Ready!',
      body: `Time for: ${stepName}`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `bake-${bakeId}`,
      requireInteraction: true,
      vibrate: [200, 100, 200], // Mobile vibration pattern
      silent: false,
      data: { stepName, bakeId } // Extra data for service worker
    };

    // Use service worker for persistent notifications (better for mobile)
    if (this.registration && 'showNotification' in this.registration) {
      try {
        await this.registration.showNotification(notificationData.title, {
          body: notificationData.body,
          icon: notificationData.icon,
          badge: notificationData.badge,
          tag: notificationData.tag,
          requireInteraction: notificationData.requireInteraction,
          // vibrate: notificationData.vibrate, // Not supported in standard NotificationOptions
          data: notificationData.data,
          // actions: [ // Not supported in standard NotificationOptions
          //   { action: 'view', title: '👀 View Bake' },
          //   { action: 'dismiss', title: '✋ Dismiss' }
          // ]
        });
        console.log('Service worker notification sent');
      } catch (error) {
        console.log('Service worker notification failed, falling back to regular notification:', error);
        this.showRegularNotification(notificationData);
      }
    } else {
      // Fallback to regular notification
      this.showRegularNotification(notificationData);
    }

    // Audio alert
    this.playAlertSound();

    // Custom event for UI components to listen to
    window.dispatchEvent(new CustomEvent('bake-step-alarm', {
      detail: { stepName, bakeId }
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
    const timeoutId = this.alarms.get(stepId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.alarms.delete(stepId);
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
}

export const bakeNotifications = BakeNotifications.getInstance();