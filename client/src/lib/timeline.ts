interface TimelineStep {
  id: string;
  name: string;
  estimatedDuration: number; // minutes
  temperature?: number; // optimal temperature
  humidity?: number; // optimal humidity
}

interface EnvironmentalFactors {
  temperature: number;
  humidity: number;
  altitude?: number;
}

interface TimelineAdjustment {
  stepId: string;
  originalDuration: number;
  adjustedDuration: number;
  factors: string[];
  timestamp: Date;
}

export class TimelineCalculator {
  private baseSteps: TimelineStep[] = [
    { id: '1', name: 'Mix Ingredients', estimatedDuration: 30 },
    { id: '2', name: 'Bulk Fermentation', estimatedDuration: 480, temperature: 24, humidity: 70 },
    { id: '3', name: 'Shape Loaves', estimatedDuration: 30 },
    { id: '4', name: 'Final Rise', estimatedDuration: 240, temperature: 22, humidity: 65 },
    { id: '5', name: 'Bake', estimatedDuration: 45 },
  ];

  /**
   * Calculate timeline adjustments based on environmental conditions
   */
  public calculateAdjustments(
    currentConditions: EnvironmentalFactors,
    steps: TimelineStep[] = this.baseSteps
  ): TimelineAdjustment[] {
    const adjustments: TimelineAdjustment[] = [];

    for (const step of steps) {
      if (!step.temperature && !step.humidity) {
        // Skip steps that don't depend on environmental conditions
        continue;
      }

      const factors: string[] = [];
      let adjustmentFactor = 1.0;

      // Temperature adjustments
      if (step.temperature) {
        const tempDiff = currentConditions.temperature - step.temperature;
        
        if (tempDiff < -3) {
          // Cold conditions slow fermentation significantly
          adjustmentFactor *= 1.3 + Math.abs(tempDiff) * 0.05;
          factors.push(`Cold temperature (${currentConditions.temperature}°C vs optimal ${step.temperature}°C)`);
        } else if (tempDiff < -1) {
          // Slightly cold conditions
          adjustmentFactor *= 1.1 + Math.abs(tempDiff) * 0.05;
          factors.push(`Cool temperature`);
        } else if (tempDiff > 3) {
          // Warm conditions speed up fermentation
          adjustmentFactor *= 0.8 - tempDiff * 0.02;
          factors.push(`Warm temperature (${currentConditions.temperature}°C vs optimal ${step.temperature}°C)`);
        } else if (tempDiff > 1) {
          // Slightly warm conditions
          adjustmentFactor *= 0.9 - tempDiff * 0.02;
          factors.push(`Warm temperature`);
        }
      }

      // Humidity adjustments
      if (step.humidity) {
        const humidityDiff = currentConditions.humidity - step.humidity;
        
        if (humidityDiff < -10) {
          // Very dry conditions slow fermentation
          adjustmentFactor *= 1.1;
          factors.push(`Low humidity (${currentConditions.humidity}% vs optimal ${step.humidity}%)`);
        } else if (humidityDiff > 15) {
          // Very humid conditions can speed up slightly
          adjustmentFactor *= 0.95;
          factors.push(`High humidity`);
        }
      }

      // Altitude adjustments (if provided)
      if (currentConditions.altitude && currentConditions.altitude > 1000) {
        // High altitude affects fermentation
        const altitudeFactor = 1 + (currentConditions.altitude - 1000) / 10000;
        adjustmentFactor *= altitudeFactor;
        factors.push(`High altitude (${currentConditions.altitude}m)`);
      }

      const adjustedDuration = Math.round(step.estimatedDuration * adjustmentFactor);
      
      if (adjustedDuration !== step.estimatedDuration) {
        adjustments.push({
          stepId: step.id,
          originalDuration: step.estimatedDuration,
          adjustedDuration,
          factors,
          timestamp: new Date(),
        });
      }
    }

    return adjustments;
  }

  /**
   * Apply adjustments to a timeline
   */
  public applyAdjustments(
    steps: TimelineStep[],
    adjustments: TimelineAdjustment[]
  ): TimelineStep[] {
    return steps.map(step => {
      const adjustment = adjustments.find(adj => adj.stepId === step.id);
      if (adjustment) {
        return {
          ...step,
          estimatedDuration: adjustment.adjustedDuration,
        };
      }
      return step;
    });
  }

  /**
   * Calculate total timeline duration
   */
  public getTotalDuration(steps: TimelineStep[]): number {
    return steps.reduce((total, step) => total + step.estimatedDuration, 0);
  }

  /**
   * Get recommended actions based on conditions
   */
  public getRecommendations(
    currentConditions: EnvironmentalFactors,
    currentStep: string
  ): string[] {
    const recommendations: string[] = [];
    const step = this.baseSteps.find(s => s.id === currentStep);
    
    if (!step) return recommendations;

    if (step.temperature) {
      const tempDiff = currentConditions.temperature - step.temperature;
      
      if (tempDiff < -3) {
        recommendations.push("Consider moving to a warmer location or using a proofing box");
      } else if (tempDiff > 3) {
        recommendations.push("Move to a cooler location to slow fermentation");
      }
    }

    if (step.humidity) {
      const humidityDiff = currentConditions.humidity - step.humidity;
      
      if (humidityDiff < -10) {
        recommendations.push("Cover dough to prevent surface drying");
      } else if (humidityDiff > 15) {
        recommendations.push("Ensure good air circulation to prevent over-proofing");
      }
    }

    return recommendations;
  }
}

export const timelineCalculator = new TimelineCalculator();
