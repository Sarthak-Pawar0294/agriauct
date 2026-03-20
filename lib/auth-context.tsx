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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
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

  // Load current session/user on mount
  useEffect(() => {
    let isMounted = true

    const getInitialUser = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data.user) {
        if (isMounted) setIsLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single()

      if (isMounted) {
        setUser(mapProfileToAuthUser(profile))
        setIsLoading(false)
      }
    }

    getInitialUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
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
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
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
    return { success: true }
  }, [])

  const register = useCallback(async (data: RegisterData) => {
    setIsLoading(true)

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })

    if (signUpError || !signUpData.user) {
      setIsLoading(false)
      return { success: false, error: signUpError?.message ?? "Registration failed" }
    }

    const { error: profileError } = await supabase.from("profiles").insert({
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
