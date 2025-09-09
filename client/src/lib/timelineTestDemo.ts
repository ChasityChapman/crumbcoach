import { timelineCalculator } from './timeline';
import { StarterHealthHelper } from './starterHealthHelper';
import type { StarterCondition, EnvironmentalFactors, TimelineStep } from './timeline';

/**
 * Demo script to test timeline adjustments with different starter health scenarios
 */
export function demonstrateTimelineAdjustments() {
  console.log('=== Timeline Adjustment Demo ===\n');

  // Base recipe steps (similar to a typical sourdough recipe)
  const baseSteps: TimelineStep[] = [
    { id: '1', name: 'Mix Ingredients', estimatedDuration: 30 },
    { id: '2', name: 'Bulk Fermentation', estimatedDuration: 480, temperature: 24, humidity: 70 },
    { id: '3', name: 'Shape Loaves', estimatedDuration: 30 },
    { id: '4', name: 'Final Rise', estimatedDuration: 240, temperature: 22, humidity: 65 },
    { id: '5', name: 'Bake', estimatedDuration: 45 },
  ];

  // Standard environmental conditions
  const standardConditions: EnvironmentalFactors = {
    temperature: 22,
    humidity: 60
  };

  // Test scenarios
  const scenarios = [
    {
      name: 'Healthy Peak Starter',
      starterCondition: StarterHealthHelper.getDemoStarterCondition('healthy'),
      conditions: standardConditions
    },
    {
      name: 'Sluggish Starter',
      starterCondition: StarterHealthHelper.getDemoStarterCondition('sluggish'),
      conditions: standardConditions
    },
    {
      name: 'Watch Status Starter',
      starterCondition: StarterHealthHelper.getDemoStarterCondition('watch'),
      conditions: standardConditions
    },
    {
      name: 'Healthy Starter + Cold Conditions',
      starterCondition: StarterHealthHelper.getDemoStarterCondition('healthy'),
      conditions: { temperature: 18, humidity: 50 } // Cold and dry
    },
    {
      name: 'Sluggish Starter + Warm Conditions',
      starterCondition: StarterHealthHelper.getDemoStarterCondition('sluggish'),
      conditions: { temperature: 28, humidity: 75 } // Warm and humid
    }
  ];

  // Calculate baseline (no adjustments)
  const baselineTotal = baseSteps.reduce((total, step) => total + step.estimatedDuration, 0);
  console.log(`Baseline Timeline: ${Math.round(baselineTotal / 60)} hours ${baselineTotal % 60} minutes\n`);

  // Test each scenario
  scenarios.forEach((scenario, index) => {
    console.log(`--- Scenario ${index + 1}: ${scenario.name} ---`);
    
    // Log starter condition details
    const condition = scenario.starterCondition;
    console.log(`Starter: ${condition.healthStatus} (${condition.stage})`);
    if (condition.activityLevel) console.log(`Activity: ${condition.activityLevel}`);
    if (condition.riseTimeHours) console.log(`Last rise: ${condition.riseTimeHours}h`);
    
    // Log environmental conditions
    console.log(`Environment: ${scenario.conditions.temperature}°C, ${scenario.conditions.humidity}% RH`);

    // Calculate adjustments
    const adjustments = timelineCalculator.calculateAdjustments(
      scenario.conditions,
      baseSteps,
      scenario.starterCondition
    );

    // Apply adjustments
    const adjustedSteps = timelineCalculator.applyAdjustments(baseSteps, adjustments);
    const adjustedTotal = timelineCalculator.getTotalDuration(adjustedSteps);
    
    // Calculate time difference
    const timeDiff = adjustedTotal - baselineTotal;
    const timeDiffPercent = ((timeDiff / baselineTotal) * 100).toFixed(1);
    
    console.log(`Adjusted Timeline: ${Math.round(adjustedTotal / 60)} hours ${adjustedTotal % 60} minutes`);
    console.log(`Time Change: ${timeDiff > 0 ? '+' : ''}${timeDiff} minutes (${timeDiffPercent}%)`);

    // Show specific adjustments
    if (adjustments.length > 0) {
      console.log('Adjustments made:');
      adjustments.forEach(adj => {
        const stepName = baseSteps.find(s => s.id === adj.stepId)?.name;
        const change = adj.adjustedDuration - adj.originalDuration;
        console.log(`  • ${stepName}: ${adj.originalDuration}→${adj.adjustedDuration}min (${change > 0 ? '+' : ''}${change}min)`);
        adj.factors.forEach(factor => console.log(`    - ${factor}`));
      });
    }

    // Show recommendations
    const recommendations = timelineCalculator.getRecommendations(
      scenario.conditions,
      '2', // Bulk fermentation step
      scenario.starterCondition
    );
    
    if (recommendations.length > 0) {
      console.log('Recommendations:');
      recommendations.forEach(rec => console.log(`  • ${rec}`));
    }

    console.log(''); // Empty line for readability
  });

  console.log('=== Demo Complete ===');
}

// Example usage in browser console or during development
// demonstrateTimelineAdjustments();