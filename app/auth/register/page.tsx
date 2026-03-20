"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Leaf, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"
import { type UserRole, indianStates, indianStateDistricts } from "@/lib/mock-data"

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { register, isLoading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    state: "",
    district: "",
    role: "farmer" as UserRole,
  })

  useEffect(() => {
    const roleParam = searchParams.get("role")
    if (roleParam === "farmer" || roleParam === "vendor") {
      setFormData((prev) => ({ ...prev, role: roleParam }))
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.state) {
      toast.error("Please select your state")
      return
    }

    if (!formData.district) {
      toast.error("Please select your district")
      return
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    const result = await register(formData)

    if (result.success) {
      toast.success("Account created successfully!")
      router.push(formData.role === "farmer" ? "/farmer/dashboard" : "/vendor/dashboard")
    } else {
      toast.error(result.error || "Registration failed")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Role Selection */}
      <div className="space-y-2">
        <Label>I am a</Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, role: "farmer" })}
            className={`rounded-lg border-2 p-4 text-center transition-colors ${
              formData.role === "farmer"
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="font-semibold">Farmer</div>
            <div className="text-xs text-muted-foreground">Sell your produce</div>
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, role: "vendor" })}
            className={`rounded-lg border-2 p-4 text-center transition-colors ${
              formData.role === "vendor"
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="font-semibold">Vendor</div>
            <div className="text-xs text-muted-foreground">Buy produce</div>
          </button>
        </div>
      </div>

      {/* Full Name */}
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          type="text"
          placeholder="Enter your full name"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          required
        />
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="Enter your phone number"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
        />
      </div>

      {/* State */}
      <div className="space-y-2">
        <Label htmlFor="state">State</Label>
        <Select
          value={formData.state}
          onValueChange={(value) => setFormData({ ...formData, state: value, district: "" })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select your state" />
          </SelectTrigger>
          <SelectContent>
            {indianStates.map((state) => (
              <SelectItem key={state} value={state}>
                {state}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* District */}
      <div className="space-y-2">
        <Label htmlFor="district">District</Label>
        <Select
          value={formData.district}
          onValueChange={(value) => setFormData({ ...formData, district: value })}
          disabled={!formData.state}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                formData.state ? "Select your district" : "Select your state first"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {formData.state &&
              (indianStateDistricts[formData.state] ?? []).map((district) => (
                <SelectItem key={district} value={district}>
                  {district}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Creating account..." : "Create Account"}
      </Button>
    </form>
  )
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">AgriAuct</span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-card-foreground">Create Account</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Join AgriAuct to start trading agricultural produce
              </p>
            </div>

            <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
              <RegisterForm />
            </Suspense>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
