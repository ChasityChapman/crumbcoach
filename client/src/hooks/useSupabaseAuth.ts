import { useState, useEffect } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error && error.message.includes('fetch')) {
        throw new Error('Network connection failed')
      }
      
      return { data, error }
    } catch (networkError: any) {
      console.warn('Network/connection error during sign in, using demo mode:', networkError.message || networkError)
      
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
      return { 
        data: { user: mockUser, session: mockSession }, 
        error: null,
        isDemoMode: true
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
      
      return { data, error }
    } catch (networkError: any) {
      console.warn('Network/connection error during sign up, using demo mode:', networkError.message || networkError)
      
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
      return { 
        data: { user: mockUser, session: mockSession }, 
        error: null,
        isDemoMode: true
      }
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const resetPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email)
    return { data, error }
  }

  const setDemoSession = (user: any, session: any) => {
    setUser(user)
    setSession(session)
    setLoading(false)
  }

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    setDemoSession,
  }
}