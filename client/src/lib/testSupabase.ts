import { supabase } from './supabase'

export async function testSupabaseConnection() {
  try {
    console.log('🔍 Testing Supabase connection...')
    
    // Test basic connectivity
    const { data, error } = await supabase.from('recipes').select('count', { count: 'exact' }).limit(0)
    
    if (error) {
      console.error('❌ Supabase connection failed:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Supabase connection successful. Recipe count:', data)
    
    // Test auth state
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('❌ Auth test failed:', authError)
      return { success: true, auth: false, error: authError.message }
    }
    
    if (user) {
      console.log('✅ User authenticated:', user.email)
      return { success: true, auth: true, user: user.email }
    } else {
      console.log('ℹ️ No user currently authenticated')
      return { success: true, auth: false }
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error)
    return { success: false, error: String(error) }
  }
}

// Test database schema access
export async function testDatabaseTables() {
  try {
    console.log('🔍 Testing database table access...')
    
    const tables = [
      'recipes',
      'bakes', 
      'starter_logs',
      'sensor_readings',
      'timeline_plans'
    ]
    
    const results = {}
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count', { count: 'exact' })
          .limit(0)
          
        if (error) {
          console.warn(`⚠️ Table ${table} access failed:`, error.message)
          results[table] = { accessible: false, error: error.message }
        } else {
          console.log(`✅ Table ${table} accessible, count:`, data)
          results[table] = { accessible: true, count: data }
        }
      } catch (err) {
        console.warn(`💥 Unexpected error testing ${table}:`, err)
        results[table] = { accessible: false, error: String(err) }
      }
    }
    
    return { success: true, tables: results }
  } catch (error) {
    console.error('💥 Database test failed:', error)
    return { success: false, error: String(error) }
  }
}