// Temporary test file to check Supabase connection
import { supabase } from './lib/supabase';

export async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('Supabase Anon Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
    
    // Test basic connection
    const { data, error } = await supabase.auth.getSession();
    console.log('Session check result:', { data, error });
    
    return { success: true, data, error };
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return { success: false, error };
  }
}