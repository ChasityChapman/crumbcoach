// Mobile-specific services for Capacitor integration
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

// Haptic Feedback Service
export class HapticService {
  static async lightImpact() {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      console.log('Haptic not available');
    }
  }

  static async mediumImpact() {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {
      console.log('Haptic not available');
    }
  }

  static async heavyImpact() {
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (e) {
      console.log('Haptic not available');
    }
  }

  static async selectionChanged() {
    try {
      await Haptics.selectionChanged();
    } catch (e) {
      console.log('Haptic not available');
    }
  }

  static async notification(type: NotificationType = NotificationType.Success) {
    try {
      await Haptics.notification({ type });
    } catch (e) {
      console.log('Haptic not available');
    }
  }
}

// Local Notifications Service for Starter Reminders
export class NotificationService {
  static async requestPermissions() {
    try {
      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    } catch (e) {
      console.error('Error requesting notification permissions:', e);
      return false;
    }
  }

  static async scheduleStarterReminder(
    starterId: string, 
    starterName: string, 
    hoursFromNow: number,
    quietHours?: { start: string; end: string }
  ) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    const scheduleTime = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
    
    // Adjust for quiet hours
    if (quietHours) {
      const adjustedTime = this.adjustForQuietHours(scheduleTime, quietHours);
      scheduleTime.setTime(adjustedTime.getTime());
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: `${starterName} is due for feeding`,
            body: `Your sourdough starter "${starterName}" is ready for its next feeding.`,
            id: parseInt(starterId.replace(/\D/g, '').slice(-6)), // Convert string ID to number
            schedule: { at: scheduleTime },
            sound: 'beep.wav',
            actionTypeId: 'STARTER_REMINDER',
            extra: {
              starterId,
              type: 'feeding_reminder'
            }
          }
        ]
      });
    } catch (e) {
      console.error('Error scheduling notification:', e);
    }
  }

  static async schedulePeakReminder(
    starterId: string,
    starterName: string, 
    estimatedPeakHours: number
  ) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    const peakTime = new Date(Date.now() + estimatedPeakHours * 60 * 60 * 1000);
    
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: `${starterName} peak activity window`,
            body: `Your starter should be reaching peak activity now (est. ${estimatedPeakHours}h after feeding).`,
            id: parseInt(starterId.replace(/\D/g, '').slice(-6)) + 1000000, // Offset for peak reminders
            schedule: { at: peakTime },
            actionTypeId: 'PEAK_REMINDER',
            extra: {
              starterId,
              type: 'peak_reminder'
            }
          }
        ]
      });
    } catch (e) {
      console.error('Error scheduling peak notification:', e);
    }
  }

  static async cancelReminders(starterId: string) {
    try {
      const baseId = parseInt(starterId.replace(/\D/g, '').slice(-6));
      await LocalNotifications.cancel({
        notifications: [
          { id: baseId }, // Feeding reminder
          { id: baseId + 1000000 } // Peak reminder
        ]
      });
    } catch (e) {
      console.error('Error canceling notifications:', e);
    }
  }

  private static adjustForQuietHours(
    scheduledTime: Date, 
    quietHours: { start: string; end: string }
  ): Date {
    const [startHour, startMin] = quietHours.start.split(':').map(Number);
    const [endHour, endMin] = quietHours.end.split(':').map(Number);
    
    const scheduled = new Date(scheduledTime);
    const hour = scheduled.getHours();
    const minutes = scheduled.getMinutes();
    
    const currentMinutes = hour * 60 + minutes;
    const quietStartMinutes = startHour * 60 + startMin;
    const quietEndMinutes = endHour * 60 + endMin;
    
    // If scheduled time is during quiet hours, move to end of quiet period
    if (quietStartMinutes > quietEndMinutes) {
      // Quiet hours cross midnight
      if (currentMinutes >= quietStartMinutes || currentMinutes <= quietEndMinutes) {
        scheduled.setHours(endHour, endMin, 0, 0);
        if (currentMinutes >= quietStartMinutes) {
          scheduled.setDate(scheduled.getDate() + 1);
        }
      }
    } else {
      // Normal quiet hours within same day
      if (currentMinutes >= quietStartMinutes && currentMinutes <= quietEndMinutes) {
        scheduled.setHours(endHour, endMin, 0, 0);
      }
    }
    
    return scheduled;
  }
}

// Camera Service for Starter Photos
export class CameraService {
  static async takePhoto(): Promise<string | null> {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      });
      
      return image.webPath || null;
    } catch (e) {
      console.error('Error taking photo:', e);
      return null;
    }
  }

  static async pickFromGallery(): Promise<string | null> {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos
      });
      
      return image.webPath || null;
    } catch (e) {
      console.error('Error picking photo:', e);
      return null;
    }
  }
}

// Geolocation Service for Ambient Temperature
export class LocationService {
  static async getCurrentTemperature(): Promise<number | null> {
    try {
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 10000
      });
      
      // In a real app, you'd call a weather API here
      // For now, return a mock temperature based on time of day
      const hour = new Date().getHours();
      const baseTemp = 20; // 20°C base
      const variation = Math.sin((hour - 6) * Math.PI / 12) * 8; // ±8°C variation
      
      return Math.round(baseTemp + variation);
    } catch (e) {
      console.error('Error getting location/temperature:', e);
      return null;
    }
  }
}

// Local Storage Service (replacing MMKV for web compatibility)
export class StorageService {
  static async set(key: string, value: any): Promise<void> {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await Preferences.set({ key, value: stringValue });
    } catch (e) {
      console.error('Error setting storage:', e);
    }
  }

  static async get<T>(key: string): Promise<T | null> {
    try {
      const result = await Preferences.get({ key });
      if (!result.value) return null;
      
      try {
        return JSON.parse(result.value) as T;
      } catch {
        return result.value as T;
      }
    } catch (e) {
      console.error('Error getting storage:', e);
      return null;
    }
  }

  static async remove(key: string): Promise<void> {
    try {
      await Preferences.remove({ key });
    } catch (e) {
      console.error('Error removing storage:', e);
    }
  }

  static async clear(): Promise<void> {
    try {
      await Preferences.clear();
    } catch (e) {
      console.error('Error clearing storage:', e);
    }
  }
}

// SQLite Service for Offline Data
export class DatabaseService {
  private static connection: SQLiteConnection | null = null;
  private static db: SQLiteDBConnection | null = null;

  static async initialize(): Promise<boolean> {
    try {
      if (!Capacitor.isNativePlatform()) {
        console.log('SQLite only available on native platforms');
        return false;
      }

      this.connection = new SQLiteConnection(CapacitorSQLite);
      
      // Create or open database
      this.db = await this.connection.createConnection(
        'crumbcoach',
        false, // not encrypted
        'no-encryption',
        1, // database version
        false // readonly
      );

      await this.db.open();
      await this.createTables();
      
      return true;
    } catch (e) {
      console.error('Error initializing SQLite:', e);
      return false;
    }
  }

  private static async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const createStarterTable = `
      CREATE TABLE IF NOT EXISTS starters (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar TEXT,
        unit_mass TEXT DEFAULT 'g',
        unit_temp TEXT DEFAULT 'C',
        archived INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced INTEGER DEFAULT 0
      );
    `;

    const createEntriesTable = `
      CREATE TABLE IF NOT EXISTS starter_entries (
        id TEXT PRIMARY KEY,
        starter_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        flour_types TEXT NOT NULL,
        ratio_s REAL NOT NULL,
        ratio_f REAL NOT NULL, 
        ratio_w REAL NOT NULL,
        total_grams INTEGER NOT NULL,
        hydration_pct INTEGER NOT NULL,
        rise_time_hours REAL,
        ambient_temp REAL,
        discard_usage TEXT,
        notes TEXT,
        photo_uri TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced INTEGER DEFAULT 0,
        FOREIGN KEY(starter_id) REFERENCES starters(id)
      );
    `;

    const createSyncQueueTable = `
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        action TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await this.db.execute(createStarterTable);
    await this.db.execute(createEntriesTable);
    await this.db.execute(createSyncQueueTable);
  }

  static async saveStarter(starter: any): Promise<boolean> {
    if (!this.db) return false;
    
    try {
      const sql = `
        INSERT OR REPLACE INTO starters 
        (id, name, avatar, unit_mass, unit_temp, archived, synced)
        VALUES (?, ?, ?, ?, ?, ?, 0)
      `;
      
      await this.db.run(sql, [
        starter.id,
        starter.name,
        starter.avatar,
        starter.unitMass,
        starter.unitTemp,
        starter.archived ? 1 : 0
      ]);

      // Add to sync queue
      await this.addToSyncQueue('starters', starter.id, 'upsert', starter);
      
      return true;
    } catch (e) {
      console.error('Error saving starter:', e);
      return false;
    }
  }

  static async saveEntry(entry: any): Promise<boolean> {
    if (!this.db) return false;
    
    try {
      const sql = `
        INSERT OR REPLACE INTO starter_entries 
        (id, starter_id, timestamp, flour_types, ratio_s, ratio_f, ratio_w, 
         total_grams, hydration_pct, rise_time_hours, ambient_temp, 
         discard_usage, notes, photo_uri, synced)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `;
      
      await this.db.run(sql, [
        entry.id,
        entry.starterId,
        entry.timestamp,
        JSON.stringify(entry.flourTypes),
        entry.ratio.s,
        entry.ratio.f,
        entry.ratio.w,
        entry.totalGrams,
        entry.hydrationPct,
        entry.riseTimeHours,
        entry.ambientTemp,
        entry.discardUsage,
        entry.notes,
        entry.photoUri
      ]);

      // Add to sync queue
      await this.addToSyncQueue('starter_entries', entry.id, 'upsert', entry);
      
      return true;
    } catch (e) {
      console.error('Error saving entry:', e);
      return false;
    }
  }

  private static async addToSyncQueue(
    tableName: string, 
    recordId: string, 
    action: string, 
    data: any
  ): Promise<void> {
    if (!this.db) return;
    
    const sql = `
      INSERT INTO sync_queue (id, table_name, record_id, action, data)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const queueId = `${tableName}_${recordId}_${Date.now()}`;
    await this.db.run(sql, [queueId, tableName, recordId, action, JSON.stringify(data)]);
  }

  static async getSyncQueue(): Promise<any[]> {
    if (!this.db) return [];
    
    try {
      const result = await this.db.query('SELECT * FROM sync_queue ORDER BY created_at ASC');
      return result.values || [];
    } catch (e) {
      console.error('Error getting sync queue:', e);
      return [];
    }
  }

  static async clearSyncQueue(ids: string[]): Promise<void> {
    if (!this.db || ids.length === 0) return;
    
    try {
      const placeholders = ids.map(() => '?').join(',');
      await this.db.run(`DELETE FROM sync_queue WHERE id IN (${placeholders})`, ids);
    } catch (e) {
      console.error('Error clearing sync queue:', e);
    }
  }
}

// Health Computation Service
export class HealthService {
  static computeHealthStatus(entries: any[], defaults: any): { status: 'healthy' | 'watch' | 'sluggish', reason: string } {
    if (entries.length === 0) {
      return { status: 'watch', reason: 'no feeding history' };
    }

    const recent = entries.slice(0, 14); // Last 14 entries
    const lastEntry = entries[0];
    
    // Check if overdue
    const hoursSinceLastFeed = (Date.now() - new Date(lastEntry.timestamp).getTime()) / (1000 * 60 * 60);
    const reminderHours = defaults?.reminderHours || 24;
    const isOverdue = hoursSinceLastFeed > reminderHours + 8; // 8 hour grace period
    
    if (isOverdue) {
      return { status: 'sluggish', reason: 'overdue feed' };
    }

    // Check rise time variability
    const riseTimes = recent
      .map(entry => entry.riseTimeHours)
      .filter(time => time != null) as number[];
    
    if (riseTimes.length >= 5) {
      const avg = riseTimes.reduce((sum, time) => sum + time, 0) / riseTimes.length;
      const variance = riseTimes.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / riseTimes.length;
      const stdDev = Math.sqrt(variance);
      
      const isUnstable = stdDev > avg * 0.35; // High variance relative to average
      
      if (isUnstable) {
        return { status: 'watch', reason: 'rise variability' };
      }
    }

    return { status: 'healthy', reason: 'on schedule' };
  }

  static predictPeakHours(lastRiseAvg: number, ambientC: number): number {
    const baseTemp = 24; // 24°C baseline
    const factor = Math.pow(2, (ambientC - baseTemp) / 10); // Q10 factor
    const predicted = lastRiseAvg / factor;
    
    // Clamp between 2 and 24 hours
    return Math.max(2, Math.min(24, predicted));
  }
}