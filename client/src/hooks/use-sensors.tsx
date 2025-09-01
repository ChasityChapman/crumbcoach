import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface SensorData {
  temperature: number;
  humidity: number;
  timestamp: Date;
}

export function useSensors() {
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const createSensorReading = useMutation({
    mutationFn: (data: { temperature?: number; humidity?: number; bakeId?: string }) =>
      apiRequest("POST", "/api/sensors", {
        temperature: data.temperature ? Math.round(data.temperature * 10) : undefined, // Store as integer
        humidity: data.humidity,
        bakeId: data.bakeId,
      }),
  });

  useEffect(() => {
    let cleanupSimulation: (() => void) | null = null;

    // Check if device sensors are available
    const checkSensorSupport = () => {
      // Check for generic sensor API (limited browser support)
      if ('Sensor' in window || 'AmbientLightSensor' in window) {
        setIsSupported(true);
        return;
      }

      // Check for device motion (can sometimes provide temperature on some devices)
      if ('DeviceMotionEvent' in window) {
        setIsSupported(true);
        return;
      }

      // Fallback: simulate sensor readings for demo
      setIsSupported(true);
      cleanupSimulation = startSimulatedReadings();
    };

    const startSimulatedReadings = () => {
      // Simulate realistic temperature and humidity variations
      const updateSensorData = () => {
        const baseTemp = 24; // Base temperature in Celsius
        const baseHumidity = 68; // Base humidity percentage
        
        // Add small random variations
        const tempVariation = (Math.random() - 0.5) * 2; // ±1°C
        const humidityVariation = (Math.random() - 0.5) * 6; // ±3%
        
        const newData: SensorData = {
          temperature: baseTemp + tempVariation,
          humidity: Math.max(0, Math.min(100, baseHumidity + humidityVariation)),
          timestamp: new Date(),
        };
        
        setSensorData(newData);
      };

      // Initial reading
      updateSensorData();
      
      // Update every 30 seconds
      const interval = setInterval(updateSensorData, 30000);
      
      return () => clearInterval(interval);
    };

    checkSensorSupport();

    // Cleanup function for the useEffect
    return () => {
      if (cleanupSimulation) {
        cleanupSimulation();
      }
    };
  }, []);

  const recordReading = (bakeId?: string) => {
    if (sensorData) {
      createSensorReading.mutate({
        temperature: sensorData.temperature,
        humidity: sensorData.humidity,
        bakeId,
      });
    }
  };

  return {
    sensorData,
    isSupported,
    recordReading,
    isRecording: createSensorReading.isPending,
  };
}
