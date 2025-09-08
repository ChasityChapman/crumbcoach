import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable. Please set it in your environment configuration.');
}

if (!supabaseKey) {
  throw new Error('Missing SUPABASE_KEY environment variable. Please set it in your environment configuration.');
}

// Create Supabase client for server-side operations
export const supabase = createClient(supabaseUrl, supabaseKey);

// Validate service role key for admin operations
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseServiceRoleKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY not found. Admin operations will use regular key with limited permissions.');
}

// Create admin client for privileged operations
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey || supabaseKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export default supabase;