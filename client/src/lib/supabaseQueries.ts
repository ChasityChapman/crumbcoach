import { supabase } from './supabase';
import type { StarterLog, Recipe, Bake, TimelinePlan, Tutorial } from '@shared/schema';

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

    const { data, error } = await supabase
      .from('starter_logs')
      .insert({
        ...starterLog,
        log_date: starterLog.logDate || new Date().toISOString(),
        user_id: user.id,
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