/**
 * Browser sensor integration utilities
 */

export interface SensorReading {
  temperature?: number;
  humidity?: number;
  timestamp: Date;
}

export interface SensorCapabilities {
  temperature: boolean;
  humidity: boolean;
  ambientLight: boolean;
  motion: boolean;
}

export class SensorManager {
  private capabilities: SensorCapabilities = {
    temperature: false,
    humidity: false,
    ambientLight: false,
    motion: false,
  };

  private listeners: ((reading: SensorReading) => void)[] = [];
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.detectCapabilities();
  }

  /**
   * Detect available sensor capabilities
   */
  private detectCapabilities() {
    // Check for generic sensor API (limited support)
    if ('Sensor' in window) {
      // Modern sensor API - very limited browser support
      this.capabilities.temperature = 'TemperatureSensor' in window;
      this.capabilities.humidity = 'HumiditySensor' in window;
      this.capabilities.ambientLight = 'AmbientLightSensor' in window;
    }

    // Check for device motion/orientation (more widely supported)
    if ('DeviceMotionEvent' in window) {
      this.capabilities.motion = true;
    }

    // For now, we'll simulate readings since real sensor access is limited
    this.capabilities.temperature = true;
    this.capabilities.humidity = true;
  }

  /**
   * Start monitoring sensors
   */
  public async startMonitoring(): Promise<boolean> {
    try {
      // Try to request permissions if available
      if ('permissions' in navigator) {
        // Request sensor permissions (if supported)
        // This is mostly for future compatibility
      }

      // For demo purposes, start simulated readings
      this.startSimulatedReadings();
      return true;
    } catch (error) {
      console.error('Failed to start sensor monitoring:', error);
      return false;
    }
  }

  /**
   * Stop monitoring sensors
   */
  public stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Add a listener for sensor readings
   */
  public addListener(callback: (reading: SensorReading) => void) {
    this.listeners.push(callback);
  }

  /**
   * Remove a listener
   */
  public removeListener(callback: (reading: SensorReading) => void) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Get current capabilities
   */
  public getCapabilities(): SensorCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Simulate realistic sensor readings for demo
   */
  private startSimulatedReadings() {
    let baseTemp = 24 + (Math.random() - 0.5) * 4; // 22-26°C base range
    let baseHumidity = 65 + (Math.random() - 0.5) * 20; // 55-75% base range

    const updateReading = () => {
      // Simulate gradual changes with some randomness
      const tempChange = (Math.random() - 0.5) * 0.5; // ±0.25°C change
      const humidityChange = (Math.random() - 0.5) * 2; // ±1% change

      baseTemp = Math.max(18, Math.min(30, baseTemp + tempChange));
      baseHumidity = Math.max(30, Math.min(90, baseHumidity + humidityChange));

      const reading: SensorReading = {
        temperature: Math.round(baseTemp * 10) / 10, // One decimal place
        humidity: Math.round(baseHumidity),
        timestamp: new Date(),
      };

      // Notify all listeners
      this.listeners.forEach(callback => callback(reading));
    };

    // Initial reading
    updateReading();

    // Update every 10 seconds
    this.intervalId = setInterval(updateReading, 10000);
  }

  /**
   * Get a single reading (useful for one-time measurements)
   */
  public async getReading(): Promise<SensorReading | null> {
    return new Promise((resolve) => {
      const listener = (reading: SensorReading) => {
        this.removeListener(listener);
        resolve(reading);
      };

      this.addListener(listener);

      // If not already monitoring, start temporarily
      if (!this.intervalId) {
        this.startMonitoring().then(success => {
          if (!success) {
            resolve(null);
          }
        });
      }

      // Timeout after 5 seconds
      setTimeout(() => {
        this.removeListener(listener);
        resolve(null);
      }, 5000);
    });
  }
}

export const sensorManager = new SensorManager();
