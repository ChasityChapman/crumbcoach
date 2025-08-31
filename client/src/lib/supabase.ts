import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabase

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project') || supabaseAnonKey.includes('your-anon-key') || true) {
  console.warn('⚠️ Using placeholder Supabase credentials - database features will not work')
  // Use demo values to prevent app crash during development
  const demoUrl = 'https://demo.supabase.co'
  const demoKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbW8iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MDk5NTIwMH0.demo-key-placeholder'
  supabase = createClient(demoUrl, demoKey)
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export { supabase }