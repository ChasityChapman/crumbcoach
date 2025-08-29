import { supabase } from './supabase';
import { getPhotoUrl } from './storage';
import type { StarterLog, Recipe, Bake, TimelinePlan, Tutorial, BakeNote, BakePhoto, TimelineStep } from '@shared/schema';

// Starter Logs
export const starterLogQueries = {
  getAll: async (): Promise<StarterLog[]> => {
    const { data, error } = await supabase
      .from('starter_logs')
      .select('*')
      .order('log_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  create: async (starterLog: Omit<StarterLog, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { logDate?: Date | undefined }): Promise<StarterLog> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Map to actual database column names
    const { data, error } = await supabase
      .from('starter_logs')
      .insert({
        log_date: starterLog.logDate || new Date().toISOString(),
        user_id: user.id,
        flour_types: starterLog.flourTypes,
        feed_ratio: starterLog.feedRatio,
        feed_amount_grams: starterLog.feedAmountGrams,
        hydration_percent: starterLog.hydrationPercent,
        ambient_temp_f: starterLog.ambientTempF || null,
        ambient_temp_c: starterLog.ambientTempC || null,
        starter_stage: starterLog.starterStage || null,
        condition_notes: starterLog.conditionNotes || "",
        rise_time_hours: starterLog.riseTimeHours || null,
        rise_time_minutes: starterLog.riseTimeMinutes || null,
        discard_used: starterLog.discardUsed || false,
        discard_recipe: starterLog.discardRecipe || "",
        peak_activity: starterLog.peakActivity || false,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<StarterLog>): Promise<StarterLog> => {
    const { data, error } = await supabase
      .from('starter_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('starter_logs')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Recipes
export const recipeQueries = {
  getAll: async (): Promise<Recipe[]> => {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  getById: async (id: string): Promise<Recipe> => {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  create: async (recipe: Omit<Recipe, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Recipe> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('recipes')
      .insert({
        ...recipe,
        user_id: user.id,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<Recipe>): Promise<Recipe> => {
    const { data, error } = await supabase
      .from('recipes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Bakes
export const bakeQueries = {
  getAll: async (): Promise<Bake[]> => {
    const { data, error } = await supabase
      .from('bakes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  getById: async (id: string): Promise<Bake> => {
    const { data, error } = await supabase
      .from('bakes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  create: async (bake: Omit<Bake, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Bake> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('bakes')
      .insert({
        ...bake,
        user_id: user.id,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<Bake>): Promise<Bake> => {
    const { data, error } = await supabase
      .from('bakes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('bakes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Timeline Plans
export const timelinePlanQueries = {
  getAll: async (): Promise<TimelinePlan[]> => {
    const { data, error } = await supabase
      .from('timeline_plans')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  getById: async (id: string): Promise<TimelinePlan> => {
    const { data, error } = await supabase
      .from('timeline_plans')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  create: async (timelinePlan: Omit<TimelinePlan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<TimelinePlan> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('timeline_plans')
      .insert({
        ...timelinePlan,
        user_id: user.id,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<TimelinePlan>): Promise<TimelinePlan> => {
    const { data, error } = await supabase
      .from('timeline_plans')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('timeline_plans')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Bake Notes
export const bakeNoteQueries = {
  getByBakeId: async (bakeId: string): Promise<BakeNote[]> => {
    const { data, error } = await supabase
      .from('bake_notes')
      .select('*')
      .eq('bake_id', bakeId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  create: async (note: Omit<BakeNote, 'id' | 'createdAt'>): Promise<BakeNote> => {
    const { data, error } = await supabase
      .from('bake_notes')
      .insert({
        bake_id: note.bakeId,
        step_index: note.stepIndex,
        content: note.content,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('bake_notes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Bake Photos
export const bakePhotoQueries = {
  getByBakeId: async (bakeId: string): Promise<BakePhoto[]> => {
    const { data, error } = await supabase
      .from('bake_photos')
      .select('*')
      .eq('bake_id', bakeId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    // Add storage URLs to photo data
    return (data || []).map(photo => ({
      ...photo,
      url: getPhotoUrl(photo.filename)
    }));
  },

  create: async (photo: Omit<BakePhoto, 'id' | 'createdAt'>): Promise<BakePhoto> => {
    const { data, error } = await supabase
      .from('bake_photos')
      .insert({
        bake_id: photo.bakeId,
        step_index: photo.stepIndex,
        filename: photo.filename,
        caption: photo.caption,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('bake_photos')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Timeline Steps
export const timelineStepQueries = {
  getByBakeId: async (bakeId: string): Promise<TimelineStep[]> => {
    const { data, error } = await supabase
      .from('timeline_steps')
      .select('*')
      .eq('bake_id', bakeId)
      .order('step_index', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  create: async (step: Omit<TimelineStep, 'id'>): Promise<TimelineStep> => {
    const { data, error } = await supabase
      .from('timeline_steps')
      .insert({
        bake_id: step.bakeId,
        step_index: step.stepIndex,
        name: step.name,
        description: step.description,
        estimated_duration_minutes: step.estimatedDuration,
        actual_duration_minutes: step.actualDuration,
        start_time: step.startTime,
        end_time: step.endTime,
        status: step.status,
        auto_adjustments: step.autoAdjustments,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<TimelineStep>): Promise<TimelineStep> => {
    const { data, error } = await supabase
      .from('timeline_steps')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Tutorials
export const tutorialQueries = {
  getAll: async (): Promise<Tutorial[]> => {
    const { data, error } = await supabase
      .from('tutorials')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
};

// User Entitlements
export const entitlementQueries = {
  getUserEntitlements: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_entitlements')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "row not found"
    return data;
  },

  updateEntitlements: async (entitlements: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_entitlements')
      .upsert({
        user_id: user.id,
        ...entitlements,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Sensor readings (mock for now)
export const sensorQueries = {
  getLatest: async (): Promise<{
    id: string;
    bakeId: string | null;
    temperature: number | null;
    humidity: number | null;
    timestamp: Date | null;
  } | null> => {
    // For now, return mock sensor data since this was previously mocked in Express
    return {
      id: 'mock-sensor-reading',
      bakeId: null,
      temperature: 240, // 24.0°C * 10
      humidity: 650,    // 65.0% * 10
      timestamp: new Date()
    };
  }
};