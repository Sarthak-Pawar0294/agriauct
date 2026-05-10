"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { type UserRole } from "./mock-data"
import { supabase } from "./supabase"

interface AuthUser {
  id: string
  fullName: string | null
  email: string | null
  phone: string | null
  state: string | null
  district: string | null
  role: UserRole | null
  createdAt: Date | null
}

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
}

interface RegisterData {
  fullName: string
  email: string
  password: string
  phone: string
  state: string
  district: string
  role: UserRole
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function mapProfileToAuthUser(profile: any | null): AuthUser | null {
  if (!profile) return null

  return {
    id: profile.id,
    fullName: profile.full_name ?? null,
    email: profile.email ?? null,
    phone: profile.phone ?? null,
    state: profile.state ?? null,
    district: profile.district ?? null,
    role: (profile.role as UserRole | null) ?? null,
    createdAt: profile.created_at ? new Date(profile.created_at) : null,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load current session/user on mount.
  // IMPORTANT: getUser() must fully complete before onAuthStateChange is
  // registered to avoid a localStorage lock race condition that causes:
  // "Lock was released because another request stole it"
  useEffect(() => {
    let isMounted = true
    let subscription: { unsubscribe: () => void } | null = null

    const initialize = async () => {
      // Step 1: Perform the initial user check and wait for it to finish.
      const { data, error } = await supabase.auth.getUser()

      if (isMounted) {
        if (!error && data.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .single()

          if (isMounted) {
            setUser(mapProfileToAuthUser(profile))
          }
        }
        // Always clear loading state after the initial check, whether or
        // not a user was found.
        setIsLoading(false)
      }

      // Step 2: Only NOW, after the initial check is complete, set up the
      // listener for future auth state changes (sign-in, sign-out, etc.).
      if (isMounted) {
        const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!session?.user) {
              setUser(null)
              return
            }

            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .single()

            setUser(mapProfileToAuthUser(profile))
          }
        )
        subscription = sub
      }
    }

    initialize()

    return () => {
      isMounted = false
      subscription?.unsubscribe()
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.user) {
      setIsLoading(false)
      return { success: false, error: error?.message ?? "Invalid email or password" }
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single()

    if (profileError) {
      setIsLoading(false)
      return { success: false, error: profileError.message }
    }

    setUser(mapProfileToAuthUser(profile))
    setIsLoading(false)
    return { success: true, role: profile.role as UserRole }
  }, [])

  const register = useCallback(async (data: RegisterData) => {
    setIsLoading(true)

    // Pass all user metadata in signUp so Supabase stores it in auth.users.raw_user_meta_data.
    // Our handle_new_user trigger reads these fields to populate public.profiles automatically.
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          phone: data.phone,
          state: data.state,
          district: data.district,
          role: data.role,
        },
      },
    })

    if (signUpError || !signUpData.user) {
      setIsLoading(false)
      return { success: false, error: signUpError?.message ?? "Registration failed" }
    }

    // Upsert the profile in case the trigger already ran, or to ensure it's fully populated.
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: signUpData.user.id,
      full_name: data.fullName,
      email: data.email,
      phone: data.phone,
      state: data.state,
      district: data.district,
      role: data.role,
    })

    if (profileError) {
      setIsLoading(false)
      return { success: false, error: profileError.message }
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", signUpData.user.id)
      .single()

    setUser(mapProfileToAuthUser(profile))
    setIsLoading(false)
    return { success: true }
  }, [])

  const logout = useCallback(async () => {
    setIsLoading(true)
    await supabase.auth.signOut()
    setUser(null)
    setIsLoading(false)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
