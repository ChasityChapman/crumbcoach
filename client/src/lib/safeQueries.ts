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
import { demoState } from './demoState';

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
      console.warn('Bake query failed:', error.message);
      if (isDemoMode()) {
        console.warn('Falling back to demo bakes');
        return demoState.getAllBakes();
      }
      throw error; // Re-throw error in production mode
    }
  },
  create: async (bakeData: any) => {
    try {
      return await bakeQueries.create(bakeData);
    } catch (error: any) {
      console.warn('Bake creation failed:', error.message);
      if (isDemoMode()) {
        console.warn('Creating bake in demo state');
        return demoState.createBake(bakeData);
      }
      throw error; // Re-throw error in production mode
    }
  },
  delete: async (bakeId: string) => {
    try {
      return await bakeQueries.delete(bakeId);
    } catch (error: any) {
      console.warn('Bake deletion failed:', error.message);
      if (isDemoMode()) {
        console.warn('Deleting from demo state');
        const deleted = demoState.deleteBake(bakeId);
        return { success: true, deleted };
      }
      throw error; // Re-throw error in production mode
    }
  },
  update: async (bakeId: string, updates: any) => {
    try {
      return await bakeQueries.update(bakeId, updates);
    } catch (error: any) {
      console.warn('Bake update failed:', error.message);
      if (isDemoMode()) {
        console.warn('Updating demo state');
        return { success: true, updated: true };
      }
      throw error; // Re-throw error in production mode
    }
  },
  getById: async (bakeId: string) => {
    try {
      return await bakeQueries.getById(bakeId);
    } catch (error: any) {
      console.warn('Bake getById failed:', error.message);
      if (isDemoMode()) {
        console.warn('Getting bake from demo state');
        const allBakes = demoState.getAllBakes();
        return allBakes.find(bake => bake.id === bakeId) || null;
      }
      throw error; // Re-throw error in production mode
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
        return demoState.getTimelineStepsByBakeId(bakeId);
      }
      throw error;
    }
  },

  // Add update function for demo mode
  update: async (stepId: string, updates: any) => {
    try {
      return await timelineStepQueries.update(stepId, updates);
    } catch (error: any) {
      console.warn('Demo mode: Updating timeline step in memory:', stepId, updates);
      if (isDemoMode()) {
        return demoState.updateTimelineStep(stepId, updates);
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