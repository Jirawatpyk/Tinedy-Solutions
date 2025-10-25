/* eslint-disable react-refresh/only-export-components */
/**
 * Auth Context Mocks
 *
 * This module provides mock implementations of the AuthContext for testing
 * components and hooks that depend on authentication state.
 *
 * @module test/mocks/auth-context
 */

import React from 'react'
import { vi } from 'vitest'
import type { User } from '@supabase/supabase-js'

type Profile = {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  role: 'admin' | 'staff'
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

/**
 * Creates a mock user for testing
 *
 * @param overrides - Partial user data to override defaults
 * @returns A mock Supabase User object
 */
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  ...overrides,
} as User)

/**
 * Creates a mock profile for testing
 *
 * @param overrides - Partial profile data to override defaults
 * @returns A mock Profile object
 */
export const createMockProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 'test-user-id',
  email: 'test@example.com',
  full_name: 'Test User',
  avatar_url: null,
  role: 'admin',
  phone: '0812345678',
  staff_number: null,
  skills: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

/**
 * Creates a mock AuthContext value for testing
 *
 * @param overrides - Partial auth context data to override defaults
 * @returns A mock AuthContextType object
 */
export const createMockAuthContext = (
  overrides: Partial<AuthContextType> = {}
): AuthContextType => ({
  user: null,
  profile: null,
  loading: false,
  signIn: vi.fn().mockResolvedValue(null),
  signUp: vi.fn().mockResolvedValue(undefined),
  signOut: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

/**
 * Creates a mock authenticated AuthContext (user is logged in)
 *
 * @param userOverrides - Partial user data to override defaults
 * @param profileOverrides - Partial profile data to override defaults
 * @returns A mock AuthContextType with authenticated user
 */
export const createMockAuthenticatedContext = (
  userOverrides: Partial<User> = {},
  profileOverrides: Partial<Profile> = {}
): AuthContextType => {
  const user = createMockUser(userOverrides)
  const profile = createMockProfile({ id: user.id, email: user.email!, ...profileOverrides })

  return createMockAuthContext({
    user,
    profile,
    loading: false,
  })
}

/**
 * Creates a mock unauthenticated AuthContext (no user logged in)
 *
 * @returns A mock AuthContextType with no user
 */
export const createMockUnauthenticatedContext = (): AuthContextType => {
  return createMockAuthContext({
    user: null,
    profile: null,
    loading: false,
  })
}

/**
 * Creates a mock loading AuthContext (authentication in progress)
 *
 * @returns A mock AuthContextType in loading state
 */
export const createMockLoadingContext = (): AuthContextType => {
  return createMockAuthContext({
    user: null,
    profile: null,
    loading: true,
  })
}

/**
 * Mock AuthProvider component for testing
 *
 * Use this to wrap components that require AuthContext in tests.
 *
 * @example
 * ```tsx
 * render(
 *   <MockAuthProvider value={createMockAuthenticatedContext()}>
 *     <ComponentUnderTest />
 *   </MockAuthProvider>
 * )
 * ```
 */
export const MockAuthProvider: React.FC<{
  children: React.ReactNode
  value: AuthContextType
}> = ({ children, value }) => {
  const AuthContext = React.createContext<AuthContextType | undefined>(value)
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
