import { createClient } from '@supabase/supabase-js'

// Note: The environment variables appear to be swapped, so we're correcting them here
const supabaseUrl = import.meta.env.VITE_SUPABASE_ANON_KEY || 'https://uwddmnpmmmxhbktnyesx.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_URL || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3ZGRtbnBtbW14aGJrdG55ZXN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMjkwNTMsImV4cCI6MjA3MTkwNTA1M30.yfHi8KtHsRollZ5IoLpWJVSYaVraPPea1KETW8dto7Q'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)