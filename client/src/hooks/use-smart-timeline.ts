import { useState, useEffect, useMemo } from 'react';
import { useSensors } from './use-sensors';

export interface TimelineAdjustment {
  stepId: string;
  originalDuration: number;
  adjustedDuration: number;
  reason: string;
  confidence: 'low' | 'medium' | 'high';
  factor: number; // multiplier applied to original duration
}

export interface SmartTimelineStep {
  id: string;
  name: string;
  originalDuration: number; // minutes
  adjustedDuration: number; // minutes
  startTime: Date;
  endTime: Date;
  status: 'pending' | 'active' | 'completed';
  stepType: 'autolyse' | 'bulk_ferment' | 'pre_shape' | 'final_proof' | 'bake' | 'other';
  isEnvironmentSensitive: boolean;
  adjustment?: TimelineAdjustment;
}

export interface SmartRecommendation {
  id: string;
  type: 'duration_adjustment' | 'environment_warning' | 'readiness_check' | 'action_required';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  stepId?: string;
  autoApplied?: boolean;
}

interface UseSmartTimelineOptions {
  bakeId: string;
  autoAdjust?: boolean;
  sensitivityLevel?: 'conservative' | 'balanced' | 'aggressive';
}

export function useSmartTimeline({ 
  bakeId, 
  autoAdjust = true,
  sensitivityLevel = 'balanced' 
}: UseSmartTimelineOptions) {
  const { currentReading, error: sensorError } = useSensors();
  const [steps, setSteps] = useState<SmartTimelineStep[]>([]);
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);
  const [lastAdjustment, setLastAdjustment] = useState<Date | null>(null);

  // Environment-based adjustment factors
  const environmentFactors = useMemo(() => {
    if (!currentReading || sensorError) {
      return {
        temperature: 1.0,
        humidity: 1.0,
        combined: 1.0,
        status: 'unknown' as const
      };
    }

    const temp = currentReading.temperature ? currentReading.temperature / 10 : 24; // Default 24°C
    const humidity = currentReading.humidity ? currentReading.humidity / 10 : 65; // Default 65%

    // Optimal ranges for sourdough: 24-27°C, 60-75% humidity
    const tempFactor = calculateTemperatureFactor(temp);
    const humidityFactor = calculateHumidityFactor(humidity);
    const combined = tempFactor * humidityFactor;

    let status: 'optimal' | 'suboptimal' | 'poor' = 'optimal';
    if (combined < 0.8 || combined > 1.3) status = 'poor';
    else if (combined < 0.9 || combined > 1.2) status = 'suboptimal';

    return {
      temperature: tempFactor,
      humidity: humidityFactor,
      combined,
      status
    };
  }, [currentReading, sensorError]);

  // Calculate temperature adjustment factor
  function calculateTemperatureFactor(temp: number): number {
    const optimal = 25.5; // °C
    const deviation = Math.abs(temp - optimal);
    
    if (deviation <= 1.5) return 1.0; // Within optimal range
    if (deviation <= 3) return temp < optimal ? 1.2 : 0.85; // Moderate deviation
    if (deviation <= 5) return temp < optimal ? 1.4 : 0.75; // Large deviation
    return temp < optimal ? 1.6 : 0.6; // Extreme deviation
  }

  // Calculate humidity adjustment factor
  function calculateHumidityFactor(humidity: number): number {
    const optimal = 67.5; // %
    const deviation = Math.abs(humidity - optimal);
    
    if (deviation <= 7.5) return 1.0; // Within optimal range (60-75%)
    if (deviation <= 15) return humidity < optimal ? 1.1 : 0.95; // Moderate deviation
    return humidity < optimal ? 1.2 : 0.9; // Large deviation
  }

  // Apply environment-based adjustments to steps
  const adjustStepsForEnvironment = (originalSteps: SmartTimelineStep[]) => {
    if (!autoAdjust) return originalSteps;

    return originalSteps.map(step => {
      if (!step.isEnvironmentSensitive || step.status === 'completed') {
        return step;
      }

      const factor = getStepAdjustmentFactor(step.stepType);
      const adjustedDuration = Math.round(step.originalDuration * factor);
      const durationDiff = adjustedDuration - step.originalDuration;

      const adjustment: TimelineAdjustment | undefined = Math.abs(durationDiff) >= 5 ? {
        stepId: step.id,
        originalDuration: step.originalDuration,
        adjustedDuration,
        reason: getAdjustmentReason(factor),
        confidence: getConfidenceLevel(factor),
        factor
      } : undefined;

      return {
        ...step,
        adjustedDuration,
        adjustment
      };
    });
  };

  function getStepAdjustmentFactor(stepType: SmartTimelineStep['stepType']): number {
    const { combined } = environmentFactors;
    
    switch (stepType) {
      case 'autolyse':
        return 1.0; // Not sensitive to environment
      case 'bulk_ferment':
      case 'final_proof':
        return combined; // Highly sensitive
      case 'pre_shape':
        return 1.0 + (combined - 1.0) * 0.3; // Moderately sensitive
      case 'bake':
        return 1.0; // Not sensitive to ambient environment
      default:
        return 1.0 + (combined - 1.0) * 0.5; // Default moderate sensitivity
    }
  }

  function getAdjustmentReason(factor: number): string {
    if (factor > 1.1) {
      return currentReading?.temperature && currentReading.temperature < 240 
        ? 'Extended due to cool temperature'
        : 'Extended due to low humidity';
    } else if (factor < 0.9) {
      return currentReading?.temperature && currentReading.temperature > 270
        ? 'Shortened due to warm temperature'
        : 'Shortened due to high humidity';
    }
    return 'Adjusted for current conditions';
  }

  function getConfidenceLevel(factor: number): 'low' | 'medium' | 'high' {
    const deviation = Math.abs(factor - 1.0);
    if (deviation < 0.1) return 'high';
    if (deviation < 0.2) return 'medium';
    return 'low';
  }

  // Generate recommendations based on current state
  const generateRecommendations = (adjustedSteps: SmartTimelineStep[]): SmartRecommendation[] => {
    const recs: SmartRecommendation[] = [];

    // Environment warnings
    if (environmentFactors.status === 'poor') {
      recs.push({
        id: 'env-warning',
        type: 'environment_warning',
        severity: 'warning',
        title: 'Suboptimal Environment',
        description: `Current conditions may significantly affect fermentation. Consider adjusting your environment.`,
        actionLabel: 'View Details'
      });
    }

    // Step adjustments
    adjustedSteps.forEach(step => {
      if (step.adjustment && Math.abs(step.adjustment.factor - 1.0) > 0.15) {
        recs.push({
          id: `adj-${step.id}`,
          type: 'duration_adjustment',
          severity: step.adjustment.confidence === 'low' ? 'warning' : 'info',
          title: `${step.name} Duration Adjusted`,
          description: `${step.adjustment.reason}. ${step.originalDuration}min → ${step.adjustedDuration}min`,
          stepId: step.id,
          autoApplied: autoAdjust
        });
      }
    });

    return recs;
  };

  // Recalculate timeline when environment changes
  useEffect(() => {
    if (steps.length === 0) return;

    const now = new Date();
    const timeSinceLastAdjustment = lastAdjustment ? now.getTime() - lastAdjustment.getTime() : Infinity;
    
    // Only adjust if it's been more than 5 minutes since last adjustment
    if (timeSinceLastAdjustment < 5 * 60 * 1000) return;

    const adjustedSteps = adjustStepsForEnvironment(steps);
    const newRecommendations = generateRecommendations(adjustedSteps);

    setSteps(adjustedSteps);
    setRecommendations(newRecommendations);
    setLastAdjustment(now);
  }, [environmentFactors, autoAdjust, steps.length]);

  // Manual adjustment functions
  const adjustStepDuration = (stepId: string, newDuration: number, reason?: string) => {
    setSteps(prev => prev.map(step => {
      if (step.id === stepId) {
        const adjustment: TimelineAdjustment = {
          stepId,
          originalDuration: step.originalDuration,
          adjustedDuration: newDuration,
          reason: reason || 'Manual adjustment',
          confidence: 'high',
          factor: newDuration / step.originalDuration
        };

        return {
          ...step,
          adjustedDuration: newDuration,
          adjustment
        };
      }
      return step;
    }));

    // Recalculate downstream step times
    recalculateStepTimes();
  };

  const recalculateStepTimes = () => {
    setSteps(prev => {
      let currentTime = new Date();
      
      return prev.map(step => {
        if (step.status === 'completed') {
          currentTime = step.endTime;
          return step;
        }

        const startTime = new Date(currentTime);
        const endTime = new Date(startTime.getTime() + step.adjustedDuration * 60 * 1000);
        
        if (step.status === 'pending') {
          currentTime = endTime;
        }

        return {
          ...step,
          startTime,
          endTime
        };
      });
    });
  };

  const dismissRecommendation = (recommendationId: string) => {
    setRecommendations(prev => prev.filter(rec => rec.id !== recommendationId));
  };

  const applyRecommendation = (recommendationId: string) => {
    const rec = recommendations.find(r => r.id === recommendationId);
    if (rec?.onAction) {
      rec.onAction();
    }
    dismissRecommendation(recommendationId);
  };

  return {
    steps,
    recommendations,
    environmentFactors,
    adjustStepDuration,
    dismissRecommendation,
    applyRecommendation,
    recalculateStepTimes,
    setSteps
  };
}