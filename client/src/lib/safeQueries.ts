// Safe query functions that provide demo data fallbacks
import { 
  bakeQueries, 
  sensorQueries, 
  recipeQueries, 
  timelineStepQueries, 
  starterLogQueries, 
  tutorialQueries,
  bakeNoteQueries,
  bakePhotoQueries 
} from './supabaseQueries';
import { 
  demoBakes, 
  demoSensorReading, 
  demoRecipes, 
  demoTimelineSteps, 
  demoStarterLogs, 
  demoTutorials 
} from './demoData';

// Check if we're in demo mode by looking for demo user
const isDemoMode = () => {
  const isDemoEnabled = import.meta.env.VITE_ENABLE_DEMO_MODE === 'true';
  return isDemoEnabled;
};

// Safe wrappers for query functions
export const safeBakeQueries = {
  getAll: async () => {
    try {
      return await bakeQueries.getAll();
    } catch (error: any) {
      console.warn('Falling back to demo bakes:', error.message);
      if (isDemoMode()) {
        return demoBakes;
      }
      throw error;
    }
  },
  create: async (bakeData: any) => {
    try {
      return await bakeQueries.create(bakeData);
    } catch (error: any) {
      console.warn('Demo mode: Cannot create bakes:', error.message);
      if (isDemoMode()) {
        // Return a mock bake
        return {
          id: `demo-bake-${Date.now()}`,
          ...bakeData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      throw error;
    }
  }
};

export const safeSensorQueries = {
  getLatest: async () => {
    try {
      return await sensorQueries.getLatest();
    } catch (error: any) {
      console.warn('Falling back to demo sensor reading:', error.message);
      if (isDemoMode()) {
        return demoSensorReading;
      }
      return null; // Return null instead of throwing for sensors
    }
  }
};

export const safeRecipeQueries = {
  getAll: async () => {
    try {
      return await recipeQueries.getAll();
    } catch (error: any) {
      console.warn('Falling back to demo recipes:', error.message);
      if (isDemoMode()) {
        return demoRecipes;
      }
      throw error;
    }
  },
  getById: async (id: string) => {
    try {
      return await recipeQueries.getById(id);
    } catch (error: any) {
      console.warn('Falling back to demo recipe:', error.message);
      if (isDemoMode()) {
        return demoRecipes.find(r => r.id === id) || demoRecipes[0];
      }
      throw error;
    }
  }
};

export const safeTimelineStepQueries = {
  create: async (stepData: any) => {
    try {
      return await timelineStepQueries.create(stepData);
    } catch (error: any) {
      console.warn('Demo mode: Cannot create timeline steps:', error.message);
      if (isDemoMode()) {
        // Return a mock success response
        return {
          id: `demo-step-${Date.now()}`,
          ...stepData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      throw error;
    }
  },
  getByBakeId: async (bakeId: string) => {
    try {
      return await timelineStepQueries.getByBakeId(bakeId);
    } catch (error: any) {
      console.warn('Falling back to demo timeline steps:', error.message);
      if (isDemoMode()) {
        return demoTimelineSteps.filter(step => step.bakeId === bakeId);
      }
      throw error;
    }
  }
};

export const safeStarterLogQueries = {
  getAll: async () => {
    try {
      return await starterLogQueries.getAll();
    } catch (error: any) {
      console.warn('Falling back to demo starter logs:', error.message);
      if (isDemoMode()) {
        return demoStarterLogs;
      }
      throw error;
    }
  },
  create: async (logData: any) => {
    try {
      return await starterLogQueries.create(logData);
    } catch (error: any) {
      console.warn('Demo mode: Cannot create starter logs:', error.message);
      if (isDemoMode()) {
        // Return a mock log
        return {
          id: `demo-log-${Date.now()}`,
          ...logData,
          userId: 'demo-user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      throw error;
    }
  }
};

export const safeTutorialQueries = {
  getAll: async () => {
    try {
      return await tutorialQueries.getAll();
    } catch (error: any) {
      console.warn('Falling back to demo tutorials:', error.message);
      if (isDemoMode()) {
        return demoTutorials;
      }
      throw error;
    }
  }
};

export const safeBakeNoteQueries = {
  getByBakeId: async (bakeId: string) => {
    try {
      return await bakeNoteQueries.getByBakeId(bakeId);
    } catch (error: any) {
      console.warn('Demo mode: No bake notes available:', error.message);
      if (isDemoMode()) {
        return []; // Return empty array for demo mode
      }
      throw error;
    }
  }
};

export const safeBakePhotoQueries = {
  getByBakeId: async (bakeId: string) => {
    try {
      return await bakePhotoQueries.getByBakeId(bakeId);
    } catch (error: any) {
      console.warn('Demo mode: No bake photos available:', error.message);
      if (isDemoMode()) {
        return []; // Return empty array for demo mode
      }
      throw error;
    }
  }
};