import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwddmnpmmmxhbktnyesx.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseKey) {
  throw new Error('Missing SUPABASE_KEY environment variable');
}

// Create Supabase client for server-side operations
export const supabase = createClient(supabaseUrl, supabaseKey);

// Create admin client for privileged operations
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export default supabase;