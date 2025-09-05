// Mutable demo state for timeline steps and bakes
import type { TimelineStep, Bake } from '@shared/schema';
import { demoTimelineSteps as initialDemoTimelineSteps, demoBakes as initialDemoBakes } from './demoData';

// Create mutable copies of demo data
let mutableDemoTimelineSteps: TimelineStep[] = [...initialDemoTimelineSteps];
let mutableDemoBakes: Bake[] = [...initialDemoBakes];

export const demoState = {
  // Get timeline steps for a specific bake
  getTimelineStepsByBakeId: (bakeId: string): TimelineStep[] => {
    return mutableDemoTimelineSteps.filter(step => step.bakeId === bakeId);
  },

  // Update a timeline step
  updateTimelineStep: (stepId: string, updates: Partial<TimelineStep>): TimelineStep | null => {
    const stepIndex = mutableDemoTimelineSteps.findIndex(step => step.id === stepId);
    if (stepIndex === -1) return null;

    mutableDemoTimelineSteps[stepIndex] = {
      ...mutableDemoTimelineSteps[stepIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return mutableDemoTimelineSteps[stepIndex];
  },

  // Create a new timeline step
  createTimelineStep: (stepData: Omit<TimelineStep, 'id' | 'createdAt' | 'updatedAt'>): TimelineStep => {
    const newStep: TimelineStep = {
      id: `demo-step-${Date.now()}`,
      ...stepData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mutableDemoTimelineSteps.push(newStep);
    return newStep;
  },

  // Reset demo state (useful for testing)
  reset: () => {
    mutableDemoTimelineSteps = [...initialDemoTimelineSteps];
  },

  // Get all timeline steps (for debugging)
  getAllTimelineSteps: () => [...mutableDemoTimelineSteps],

  // Bake management
  getAllBakes: () => [...mutableDemoBakes],
  
  deleteBake: (bakeId: string): boolean => {
    const initialLength = mutableDemoBakes.length;
    mutableDemoBakes = mutableDemoBakes.filter(bake => bake.id !== bakeId);
    
    // Also remove associated timeline steps
    mutableDemoTimelineSteps = mutableDemoTimelineSteps.filter(step => step.bakeId !== bakeId);
    
    return mutableDemoBakes.length < initialLength; // Return true if something was deleted
  },

  createBake: (bakeData: Omit<Bake, 'id' | 'createdAt' | 'updatedAt'>): Bake => {
    const newBake: Bake = {
      id: `demo-bake-${Date.now()}`,
      ...bakeData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mutableDemoBakes.push(newBake);
    return newBake;
  },

  // Reset demo state (useful for testing)
  reset: () => {
    mutableDemoTimelineSteps = [...initialDemoTimelineSteps];
    mutableDemoBakes = [...initialDemoBakes];
  },
};