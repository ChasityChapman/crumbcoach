import { useState, useEffect } from "react";
import type { SensorReading } from "@shared/schema";
import { Thermometer, Droplets, WifiOff } from "lucide-react";
import { Card, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SensorWidgetProps {
  reading: SensorReading | null | undefined;
}

export default function SensorWidget({ reading }: SensorWidgetProps) {
  const [tempUnit, setTempUnit] = useState<'celsius' | 'fahrenheit'>('celsius');
  
  // Load temperature unit preference
  useEffect(() => {
    const saved = localStorage.getItem('crumbCoachSettings');
    if (saved) {
      const settings = JSON.parse(saved);
      if (settings.tempUnit) {
        setTempUnit(settings.tempUnit);
      }
    }
  }, []);
  
  const tempCelsius = reading ? (reading.temperature || 240) / 10 : 24;
  const temperature = tempUnit === 'fahrenheit' ? (tempCelsius * 9/5) + 32 : tempCelsius;
  const humidity = reading ? (reading.humidity || 680) / 10 : 68;

  // Show empty state if no sensor reading
  if (!reading) {
    return (
      <div className="px-4 mb-6">
        <EmptyState
          icon={<WifiOff className="w-8 h-8" />}
          title="No Sensor Data"
          description="Connect your environmental sensors to monitor temperature and humidity for optimal sourdough conditions."
          action={
            <Button variant="outline" size="sm">
              Connect Sensors
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="px-4 mb-6">
      <div className="grid grid-cols-2 gap-4">
        <Card variant="compact" className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Thermometer className="w-5 h-5 text-accent-orange-500" />
            <span className="text-xs text-sourdough-500 bg-sourdough-100 px-2 py-1 rounded-full">
              AUTO
            </span>
          </div>
          <p className="text-2xl font-semibold text-sourdough-800">
            {temperature.toFixed(1)}°{tempUnit === 'celsius' ? 'C' : 'F'}
          </p>
          <p className="text-sm text-sourdough-500">Temperature</p>
        </Card>
        
        <Card variant="compact" className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Droplets className="w-5 h-5 text-blue-500" />
            <span className="text-xs text-sourdough-500 bg-sourdough-100 px-2 py-1 rounded-full">
              AUTO
            </span>
          </div>
          <p className="text-2xl font-semibold text-sourdough-800">
            {humidity}%
          </p>
          <p className="text-sm text-sourdough-500">Humidity</p>
        </Card>
      </div>
    </div>
  );
}
