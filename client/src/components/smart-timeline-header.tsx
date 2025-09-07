import { useMemo } from "react";
import { Clock, Thermometer, Droplets, TrendingUp, TrendingDown } from "lucide-react";
import { safeParseDate } from "@/lib/utils";
import { useSensors } from "@/hooks/use-sensors";

interface SmartTimelineHeaderProps {
  bakeName: string;
  recipeId: string;
  startTime: string | Date | null;
  estimatedEndTime: string | Date | null;
  currentStep: number;
  totalSteps: number;
}

export default function SmartTimelineHeader({
  bakeName,
  recipeId,
  startTime,
  estimatedEndTime,
  currentStep,
  totalSteps
}: SmartTimelineHeaderProps) {
  const { currentReading, error: sensorError } = useSensors();

  const environmentStatus = useMemo(() => {
    if (!currentReading || sensorError) return 'Unknown';
    
    const temp = currentReading.temperature ? currentReading.temperature / 10 : null;
    const humidity = currentReading.humidity ? currentReading.humidity / 10 : null;
    
    // Optimal sourdough ranges: 75-80°F (24-27°C), 60-75% humidity
    if (temp && humidity) {
      const tempOptimal = temp >= 24 && temp <= 27;
      const humidityOptimal = humidity >= 60 && humidity <= 75;
      
      if (tempOptimal && humidityOptimal) return 'Optimal';
      if (temp < 22) return 'Cold';
      if (temp > 29) return 'Warm';
      if (humidity < 55) return 'Dry';
      if (humidity > 80) return 'Humid';
      return 'Stable';
    }
    
    return 'Monitoring';
  }, [currentReading, sensorError]);

  const environmentStatusColor = useMemo(() => {
    switch (environmentStatus) {
      case 'Optimal': return 'text-green-600 bg-green-50 border-green-200';
      case 'Cold': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Warm': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Dry': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Humid': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'Stable': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  }, [environmentStatus]);

  const formatTime = (time: string | Date | null) => {
    if (!time) return 'Unknown';
    const date = safeParseDate(time);
    if (!date || isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getProgressPercentage = () => {
    if (totalSteps === 0) return 0;
    return Math.round((currentStep / totalSteps) * 100);
  };

  return (
    <div className="bg-white border-b border-sourdough-200 px-4 py-4">
      {/* Bake Context */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-xl text-sourdough-800 truncate">
              {bakeName}
            </h1>
            <div className="flex items-center space-x-4 mt-1 text-sm text-sourdough-600">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>ETA: {formatTime(estimatedEndTime)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>Step {currentStep} of {totalSteps}</span>
              </div>
            </div>
          </div>
          
          {/* Progress Ring */}
          <div className="flex-shrink-0 relative">
            <div className="w-16 h-16">
              <svg viewBox="0 0 36 36" className="circular-progress">
                <path
                  className="circle-bg"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e5e5e5"
                  strokeWidth="2"
                />
                <path
                  className="circle"
                  strokeDasharray={`${getProgressPercentage()}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#8B4513"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-semibold text-sourdough-700">
                  {getProgressPercentage()}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Environment Summary */}
      <div className="flex items-center justify-between bg-sourdough-50 rounded-lg p-3">
        <div className="flex items-center space-x-4">
          {/* Temperature */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <Thermometer className="w-4 h-4 text-sourdough-600" />
              <span className="text-sm font-medium text-sourdough-800">
                {currentReading?.temperature ? 
                  `${Math.round(currentReading.temperature / 10)}°C` : 
                  '--°C'
                }
              </span>
            </div>
          </div>
          
          {/* Humidity */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <Droplets className="w-4 h-4 text-sourdough-600" />
              <span className="text-sm font-medium text-sourdough-800">
                {currentReading?.humidity ? 
                  `${Math.round(currentReading.humidity / 10)}%` : 
                  '--%'
                }
              </span>
            </div>
          </div>
        </div>

        {/* Environment Status */}
        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${environmentStatusColor}`}>
          <div className="flex items-center space-x-1">
            {environmentStatus === 'Optimal' && <TrendingUp className="w-3 h-3" />}
            {(environmentStatus === 'Cold' || environmentStatus === 'Dry') && <TrendingDown className="w-3 h-3" />}
            <span>{environmentStatus}</span>
          </div>
        </div>
      </div>
    </div>
  );
}