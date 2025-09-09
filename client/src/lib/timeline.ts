import { timeMultiplierFromRH, getHumidity } from './humidity-adjustments';
import type { HealthSnapshot } from '@shared/schema';

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

interface StarterCondition {
  healthStatus: HealthSnapshot['status'];
  stage: 'just_fed' | 'peak' | 'collapsing' | 'sluggish';
  riseTimeHours?: number;
  activityLevel?: 'low' | 'moderate' | 'high';
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
   * Calculate timeline adjustments based on environmental conditions and starter health
   */
  public calculateAdjustments(
    currentConditions: EnvironmentalFactors,
    steps: TimelineStep[] = this.baseSteps,
    starterCondition?: StarterCondition
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

      // Humidity adjustments using smart rules
      if (step.humidity || (step.name.includes('Fermentation') || step.name.includes('Rise'))) {
        const humidityMultiplier = timeMultiplierFromRH(currentConditions.humidity);
        adjustmentFactor *= humidityMultiplier;
        
        if (humidityMultiplier !== 1.0) {
          const description = this.getHumidityDescription(currentConditions.humidity);
          factors.push(`${description} (${currentConditions.humidity}% RH, ×${humidityMultiplier.toFixed(2)})`);
        }
      }

      // Altitude adjustments (if provided)
      if (currentConditions.altitude && currentConditions.altitude > 1000) {
        // High altitude affects fermentation
        const altitudeFactor = 1 + (currentConditions.altitude - 1000) / 10000;
        adjustmentFactor *= altitudeFactor;
        factors.push(`High altitude (${currentConditions.altitude}m)`);
      }

      // Starter health adjustments for fermentation steps
      if (starterCondition && (step.name.includes('Fermentation') || step.name.includes('Rise'))) {
        const starterAdjustment = this.getStarterAdjustmentFactor(starterCondition);
        if (starterAdjustment.factor !== 1.0) {
          adjustmentFactor *= starterAdjustment.factor;
          factors.push(starterAdjustment.description);
        }
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
    currentStep: string,
    starterCondition?: StarterCondition
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

    // Add starter-specific recommendations
    if (starterCondition) {
      recommendations.push(...this.getStarterRecommendations(starterCondition));
    }

    return recommendations;
  }

  /**
   * Get humidity condition description
   */
  private getHumidityDescription(rh: number): string {
    if (rh >= 70) return "Very high humidity";
    if (rh >= 55) return "High humidity";
    if (rh <= 30) return "Very low humidity";
    if (rh <= 40) return "Low humidity";
    return "Normal humidity";
  }

  /**
   * Get starter adjustment factor based on health and stage
   */
  private getStarterAdjustmentFactor(starterCondition: StarterCondition): { factor: number; description: string } {
    let factor = 1.0;
    let description = '';

    // Health status adjustments
    switch (starterCondition.healthStatus) {
      case 'sluggish':
        factor *= 1.25; // 25% longer for sluggish starter
        description = 'Sluggish starter (+25% fermentation time)';
        break;
      case 'watch':
        factor *= 1.1; // 10% longer for starter under watch
        description = 'Starter needs monitoring (+10% fermentation time)';
        break;
      case 'healthy':
        // No adjustment for healthy starter
        break;
    }

    // Stage adjustments (compound with health adjustments)
    switch (starterCondition.stage) {
      case 'peak':
        factor *= 0.9; // 10% faster for peak activity
        description = description ? 
          `${description}, peak activity (-10%)` : 
          'Peak starter activity (-10% fermentation time)';
        break;
      case 'just_fed':
        factor *= 1.15; // 15% longer for just-fed starter
        description = description ?
          `${description}, just fed (+15%)` :
          'Just-fed starter (+15% fermentation time)';
        break;
      case 'collapsing':
        factor *= 1.2; // 20% longer for collapsing starter
        description = description ?
          `${description}, past peak (+20%)` :
          'Past-peak starter (+20% fermentation time)';
        break;
      case 'sluggish':
        // Already covered in health status, but compound if both are sluggish
        if (starterCondition.healthStatus === 'sluggish') {
          factor *= 1.1; // Additional 10% for double sluggish condition
          description = 'Very sluggish starter (+37.5% total fermentation time)';
        }
        break;
    }

    // Activity level fine-tuning
    if (starterCondition.activityLevel) {
      switch (starterCondition.activityLevel) {
        case 'low':
          factor *= 1.1;
          description = description ?
            `${description}, low activity (+10%)` :
            'Low starter activity (+10% fermentation time)';
          break;
        case 'high':
          factor *= 0.95;
          description = description ?
            `${description}, high activity (-5%)` :
            'High starter activity (-5% fermentation time)';
          break;
      }
    }

    // Rise time adjustments (if available from recent logs)
    if (starterCondition.riseTimeHours) {
      // Normal rise time is ~6-8 hours, adjust based on actual performance
      const expectedRiseHours = 7; // baseline
      const riseRatio = starterCondition.riseTimeHours / expectedRiseHours;
      
      if (riseRatio > 1.2) { // Takes 20% longer than expected
        factor *= 1.1;
        description = description ?
          `${description}, slow recent rise (+10%)` :
          'Slow recent rise time (+10% fermentation time)';
      } else if (riseRatio < 0.8) { // 20% faster than expected
        factor *= 0.95;
        description = description ?
          `${description}, fast recent rise (-5%)` :
          'Fast recent rise time (-5% fermentation time)';
      }
    }

    return { factor, description };
  }

  /**
   * Get starter-specific recommendations
   */
  public getStarterRecommendations(starterCondition: StarterCondition): string[] {
    const recommendations: string[] = [];

    if (starterCondition.healthStatus === 'sluggish') {
      recommendations.push("Consider refreshing your starter 2-3 times before baking");
      recommendations.push("Extend fermentation times by 25-30%");
      recommendations.push("Check starter temperature - aim for 75-80°F for feeding");
    } else if (starterCondition.healthStatus === 'watch') {
      recommendations.push("Monitor starter activity closely during this bake");
      recommendations.push("Consider an extra feeding if starter seems slow");
    }

    if (starterCondition.stage === 'just_fed') {
      recommendations.push("Wait 4-6 hours for starter to reach peak activity before mixing");
      recommendations.push("Look for doubled size and bubbling before using");
    } else if (starterCondition.stage === 'peak') {
      recommendations.push("Perfect timing! Your starter is at peak activity");
      recommendations.push("Use within 2-3 hours for best results");
    } else if (starterCondition.stage === 'collapsing') {
      recommendations.push("Starter is past peak - extend fermentation by 20%");
      recommendations.push("Consider refreshing starter for next bake");
    }

    return recommendations;
  }

  /**
   * Calculate smart timeline adjustments with real humidity data and starter condition
   */
  public async calculateSmartAdjustments(
    currentConditions: EnvironmentalFactors,
    steps: TimelineStep[] = this.baseSteps,
    starterCondition?: StarterCondition
  ): Promise<{ adjustments: TimelineAdjustment[], humidityData: number | null }> {
    // Try to get real humidity data
    const realHumidity = await getHumidity().catch(() => null);
    
    // Use real humidity if available, otherwise fall back to provided value
    const conditionsToUse = {
      ...currentConditions,
      humidity: realHumidity ?? currentConditions.humidity
    };

    const adjustments = this.calculateAdjustments(conditionsToUse, steps, starterCondition);
    
    return {
      adjustments,
      humidityData: realHumidity
    };
  }
}

export const timelineCalculator = new TimelineCalculator();

// Export types for use in other components
export type { StarterCondition, EnvironmentalFactors, TimelineStep, TimelineAdjustment };
