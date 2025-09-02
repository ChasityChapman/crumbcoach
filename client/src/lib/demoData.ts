// Demo data for offline mode
import type { Bake, Recipe, SensorReading, TimelineStep, StarterLog, Tutorial } from '@shared/schema';

// Demo recipes
export const demoRecipes: Recipe[] = [
  {
    id: 'demo-recipe-1',
    userId: 'demo-user',
    name: 'Classic Sourdough Loaf',
    description: 'A traditional sourdough bread perfect for beginners',
    ingredients: JSON.stringify([
      { name: 'Bread flour', amount: 500, unit: 'g' },
      { name: 'Water', amount: 350, unit: 'ml' },
      { name: 'Sourdough starter', amount: 100, unit: 'g' },
      { name: 'Salt', amount: 10, unit: 'g' }
    ]),
    instructions: JSON.stringify([
      'Mix flour and water, let rest 30 minutes',
      'Add starter and salt, mix well',
      'Bulk ferment 4-6 hours with folds every 30 minutes',
      'Shape and final proof 2-4 hours',
      'Bake at 450°F for 45 minutes'
    ]),
    totalTimeMinutes: 480,
    difficulty: 'beginner',
    yieldAmount: 1,
    yieldUnit: 'loaf',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

// Demo bakes
export const demoBakes: Bake[] = [
  {
    id: 'demo-bake-1',
    userId: 'demo-user',
    recipeId: 'demo-recipe-1',
    recipeName: 'Classic Sourdough Loaf',
    status: 'active',
    startTime: new Date(Date.now() - 3600000).toISOString(), // Started 1 hour ago
    endTime: null,
    notes: 'Demo bake in progress',
    finalWeight: null,
    finalScore: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

// Demo sensor readings
export const demoSensorReading: SensorReading = {
  id: 'demo-sensor-1',
  bakeId: 'demo-bake-1',
  temperature: 78,
  humidity: 65,
  timestamp: new Date().toISOString(),
  userId: 'demo-user',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Demo timeline steps
export const demoTimelineSteps: TimelineStep[] = [
  {
    id: 'demo-step-1',
    bakeId: 'demo-bake-1',
    stepNumber: 1,
    title: 'Mix ingredients',
    description: 'Combine flour and water',
    estimatedDuration: 15,
    actualDuration: null,
    status: 'completed',
    scheduledTime: new Date(Date.now() - 3600000).toISOString(),
    completedTime: new Date(Date.now() - 3540000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-step-2',
    bakeId: 'demo-bake-1',
    stepNumber: 2,
    title: 'Bulk fermentation',
    description: 'Let dough rise with periodic folds',
    estimatedDuration: 240,
    actualDuration: null,
    status: 'active',
    scheduledTime: new Date(Date.now() - 3540000).toISOString(),
    completedTime: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

// Demo starter logs
export const demoStarterLogs: StarterLog[] = [
  {
    id: 'demo-log-1',
    userId: 'demo-user',
    logDate: new Date().toISOString(),
    flourTypes: ['Bread Flour', 'Whole Wheat'],
    feedRatio: '1:1:1',
    feedAmountGrams: 50,
    hydrationPercent: 100,
    ambientTempF: 72,
    ambientTempC: 22,
    starterStage: 'mature',
    conditionNotes: 'Active and bubbly',
    riseTimeHours: 4,
    riseTimeMinutes: 30,
    discardUsed: false,
    discardRecipe: '',
    peakActivity: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

// Demo tutorials
export const demoTutorials: Tutorial[] = [
  {
    id: 'demo-tutorial-1',
    title: 'Getting Started with Sourdough',
    description: 'Learn the basics of sourdough bread making',
    content: 'Demo tutorial content...',
    difficulty: 'beginner',
    estimatedTimeMinutes: 30,
    tags: ['basics', 'starter'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];