import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<any>
  signOut: () => Promise<any>
  resetPassword: (email: string) => Promise<any>
  setDemoMode: (mockUser: any, mockSession: any) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Only allow demo mode if explicitly enabled via environment variable
  const isDemoModeAllowed = import.meta.env.VITE_ENABLE_DEMO_MODE === 'true'

  useEffect(() => {
    console.log('Initializing authentication...')
    
    // Check if we're in demo mode immediately
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    
    // Debug logging for mobile
    console.log('Supabase credentials check:', {
      url: supabaseUrl ? 'present' : 'missing',
      key: supabaseAnonKey ? 'present' : 'missing',
      urlValue: supabaseUrl || 'undefined',
      keyStart: (supabaseAnonKey && typeof supabaseAnonKey === 'string') ? supabaseAnonKey.substring(0, 10) + '...' : 'undefined'
    });
    
    const hasValidCredentials = supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project') && !supabaseAnonKey.includes('your-anon-key');
    
    if (!hasValidCredentials) {
      console.warn('Missing or placeholder Supabase credentials - skipping auth initialization')
      setSession(null)
      setUser(null)
      setLoading(false)
      // Don't return early - continue with useEffect to avoid hooks issue
    }

    let timeoutId: NodeJS.Timeout | null = null;
    let subscription: any = null;

    if (hasValidCredentials) {
      // Set a very short timeout to prevent hanging
      timeoutId = setTimeout(() => {
        console.warn('Authentication timeout - assuming no session')
        setSession(null)
        setUser(null)
        setLoading(false)
      }, 1000) // Reduced to 1 second

      // Try to get initial session with immediate fallback
      Promise.race([
        supabase.auth.getSession(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 500))
      ]).then(({ data: { session } }: any) => {
        if (timeoutId) clearTimeout(timeoutId)
        console.log('Got session:', !!session)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }).catch((error) => {
        if (timeoutId) clearTimeout(timeoutId)
        console.warn('Failed to get initial session, assuming no auth:', error.message)
        setSession(null)
        setUser(null)
        setLoading(false)
      })

      // Skip auth state change listener in demo mode to avoid hanging
      try {
        const result = supabase.auth.onAuthStateChange((_event: any, session: Session | null) => {
          console.log('Auth state changed:', !!session)
          setSession(session)
          setUser(session?.user ?? null)
          setLoading(false)
        })
        subscription = result.data.subscription
      } catch (error) {
        console.warn('Failed to setup auth state listener:', error)
      }
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (subscription) {
        try {
          subscription.unsubscribe()
        } catch (error) {
          console.warn('Failed to unsubscribe from auth changes:', error)
        }
      }
    }
  }, []) // Empty dependency array to run only once on mount

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error && error.message.includes('fetch')) {
        throw new Error('Network connection failed')
      }
      
      if (!error && data.user && data.session) {
        setUser(data.user)
        setSession(data.session)
      }
      
      return { data, error }
    } catch (networkError: any) {
      console.error('Network/connection error during sign in:', networkError.message || networkError)
      
      // Only fallback to demo mode if explicitly enabled
      if (!isDemoModeAllowed) {
        console.error('Authentication service unavailable. Demo mode is disabled in production.')
        return {
          data: null,
          error: {
            message: 'Authentication service temporarily unavailable. Please try again later.',
            details: 'Network connection failed and demo mode is disabled for security.'
          }
        }
      }
      
      console.warn('Using demo mode (enabled via VITE_ENABLE_DEMO_MODE)')
      const mockUser = {
        id: 'demo-user-123',
        email: email,
        email_confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: { name: 'Demo User' },
        aud: 'authenticated',
        role: 'authenticated'
      }
      const mockSession = {
        access_token: 'demo-access-token',
        refresh_token: 'demo-refresh-token',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: mockUser
      }
      
      console.log('Demo user session created successfully')
      setUser(mockUser)
      setSession(mockSession)
      return { 
        data: { user: mockUser, session: mockSession }, 
        error: null,
        isDemoMode: true,
        mockUser,
        mockSession
      }
    }
  }

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      })
      
      if (error && error.message.includes('fetch')) {
        throw new Error('Network connection failed')
      }
      
      if (!error && data.user && data.session) {
        setUser(data.user)
        setSession(data.session)
      }
      
      return { data, error }
    } catch (networkError: any) {
      console.error('Network/connection error during sign up:', networkError.message || networkError)
      
      // Only fallback to demo mode if explicitly enabled
      if (!isDemoModeAllowed) {
        console.error('Authentication service unavailable. Demo mode is disabled in production.')
        return {
          data: null,
          error: {
            message: 'Authentication service temporarily unavailable. Please try again later.',
            details: 'Network connection failed and demo mode is disabled for security.'
          }
        }
      }
      
      console.warn('Using demo mode for sign up (enabled via VITE_ENABLE_DEMO_MODE)')
      const mockUser = {
        id: 'demo-user-' + Date.now(),
        email: email,
        email_confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: { name: 'Demo User', ...metadata },
        aud: 'authenticated',
        role: 'authenticated'
      }
      const mockSession = {
        access_token: 'demo-access-token',
        refresh_token: 'demo-refresh-token',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: mockUser
      }
      
      console.log('Demo user account created successfully')
      setUser(mockUser)
      setSession(mockSession)
      return { 
        data: { user: mockUser, session: mockSession }, 
        error: null,
        isDemoMode: true,
        mockUser,
        mockSession
      }
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
      setSession(null)
    }
    return { error }
  }

  const resetPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email)
    return { data, error }
  }

  const setDemoMode = (mockUser: any, mockSession: any) => {
    console.log('Setting demo mode globally:', { user: !!mockUser, session: !!mockSession })
    setUser(mockUser)
    setSession(mockSession)
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    setDemoMode,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useSupabaseAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within an AuthProvider')
  }
  return context
}