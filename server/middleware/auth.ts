// This file is deprecated - use server/middleware/supabaseAuth.ts instead
// 
// The authentication middleware has been moved to use Supabase Auth 
// for better security and consistency with the rest of the application.
// 
// Import from: import { authenticateUser } from '../middleware/supabaseAuth';

export { authenticateUser, optionalAuth } from './supabaseAuth';