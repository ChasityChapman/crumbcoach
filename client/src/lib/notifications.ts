export class BakeNotifications {
  private static instance: BakeNotifications;
  private alarms: Map<string, NodeJS.Timeout> = new Map();
  private permission: NotificationPermission = "default";

  private constructor() {
    this.checkPermission();
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

  private triggerStepNotification(stepName: string, bakeId: string): void {
    // Browser notification
    if (this.permission === "granted") {
      const notification = new Notification(`🍞 Baking Step Ready!`, {
        body: `Time for: ${stepName}`,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: `bake-${bakeId}`,
        requireInteraction: true
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 30 seconds
      setTimeout(() => notification.close(), 30000);
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

  public hasPermission(): boolean {
    return this.permission === "granted";
  }
}

export const bakeNotifications = BakeNotifications.getInstance();