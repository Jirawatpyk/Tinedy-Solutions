import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

type Profile = {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  role: 'admin' | 'manager' | 'staff'
  phone: string | null
  staff_number: string | null
  skills: string[] | null
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<Profile | null>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) throw error

      // If no profile exists, set to null (don't throw error)
      setProfile(data)
      return data
    } catch (error) {
      logger.error('Error fetching profile', { error, userId }, { context: 'AuthContext' })
      // Set profile to null instead of throwing
      setProfile(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  // Realtime subscription for profile updates
  useEffect(() => {
    if (!user) return

    const profileSubscription = supabase
      .channel(`profile-updates:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            setProfile((prev) => {
              if (!prev) return null

              return {
                ...prev,
                full_name: payload.new.full_name || prev.full_name,
                phone: payload.new.phone ?? prev.phone,
                avatar_url: payload.new.avatar_url ?? prev.avatar_url,
                updated_at: payload.new.updated_at || prev.updated_at,
              }
            })
          }
        }
      )
      .subscribe()

    return () => {
      profileSubscription.unsubscribe()
    }
  }, [user])

  const signIn = useCallback(async (email: string, password: string) => {
    // Sanitize and validate inputs
    const sanitizedEmail = email.trim().toLowerCase()

    // Validate email format
    if (!sanitizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
      throw new Error('Invalid email format')
    }

    // Validate password
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters')
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: sanitizedEmail,
      password,
    })

    if (error) {
      // Provide user-friendly error messages
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password')
      } else if (error.message.includes('Email not confirmed')) {
        throw new Error('Please confirm your email before signing in')
      } else {
        throw new Error('Failed to sign in. Please try again')
      }
    }

    // Wait for profile to be fetched before resolving
    if (data.user) {
      setUser(data.user)
      const profileData = await fetchProfile(data.user.id)
      return profileData
    }
    return null
  }, [fetchProfile])

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })
    if (error) throw error

    if (data.user) {
      // Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        full_name: fullName,
        role: 'staff', // Default role
      })
      if (profileError) throw profileError

      // Set user and fetch the newly created profile
      setUser(data.user)
      await fetchProfile(data.user.id)
    }
  }, [fetchProfile])

  const signOut = useCallback(async () => {
    try {
      // Attempt to sign out from Supabase (best effort)
      const { error } = await supabase.auth.signOut({ scope: 'local' })

      if (error) {
        // Log but don't throw - we still want to clear local state
        logger.warn('Sign out warning', { error: error.message }, { context: 'AuthContext' })
      }
    } catch (error) {
      // Network error or other issues - continue with local cleanup
      logger.error('Sign out error', { error }, { context: 'AuthContext' })
    } finally {
      // Always clear local state (this is critical for UX)
      setUser(null)
      setProfile(null)

      // Let Supabase client handle its own storage cleanup
      // This is more robust than manual localStorage removal
    }
  }, [])

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  }), [user, profile, loading, signIn, signUp, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
