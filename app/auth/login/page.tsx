"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Leaf, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const result = await login(formData.email, formData.password)
    
    if (result.success) {
      toast.success("Welcome back!")
      // The auth context will have the user, redirect based on role
      // For demo, we'll check the email to determine role
      if (formData.email.includes("rajesh") || formData.email.includes("priya")) {
        router.push("/farmer/dashboard")
      } else {
        router.push("/vendor/dashboard")
      }
    } else {
      toast.error(result.error || "Login failed")
    }
  }

  // Demo quick login buttons
  const quickLogin = async (email: string, role: "farmer" | "vendor") => {
    setFormData({ email, password: "demo123" })
    const result = await login(email, "demo123")
    if (result.success) {
      toast.success("Welcome back!")
      router.push(role === "farmer" ? "/farmer/dashboard" : "/vendor/dashboard")
    }
  }

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

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-card-foreground">Welcome Back</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Sign in to your account to continue
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
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

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Demo Accounts</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => quickLogin("rajesh@example.com", "farmer")}
                  disabled={isLoading}
                >
                  Farmer Demo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => quickLogin("amit@example.com", "vendor")}
                  disabled={isLoading}
                >
                  Vendor Demo
                </Button>
              </div>
            </div>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              {"Don't have an account? "}
              <Link href="/auth/register" className="font-medium text-primary hover:underline">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
