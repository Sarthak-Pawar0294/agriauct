"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Leaf,
  LayoutDashboard,
  Gavel,
  Bell,
  History,
  LogOut,
  Menu,
  X,
  User,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

const farmerNavItems: NavItem[] = [
  { href: "/farmer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/farmer/auctions", label: "My Auctions", icon: Gavel },
  { href: "/farmer/notifications", label: "Notifications", icon: Bell },
]

const vendorNavItems: NavItem[] = [
  { href: "/vendor/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vendor/browse", label: "Browse Auctions", icon: Search },
  { href: "/vendor/bids", label: "Bid History", icon: History },
  { href: "/vendor/notifications", label: "Notifications", icon: Bell },
]

export function DashboardLayout({
  children,
  role,
}: {
  children: React.ReactNode
  role: "farmer" | "vendor"
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = role === "farmer" ? farmerNavItems : vendorNavItems

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="flex h-16 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden"
            >
              <Menu className="h-6 w-6 text-foreground" />
            </button>
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Leaf className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">AgriAuct</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-full bg-muted px-3 py-1.5 sm:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="text-sm">
                <div className="font-medium text-foreground">{user?.fullName || "Guest"}</div>
                <div className="text-xs capitalize text-muted-foreground">{role}</div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-border bg-card lg:block">
          <nav className="flex h-full flex-col p-4">
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
            <div className="mt-auto pt-4">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                Logout
              </Button>
            </div>
          </nav>
        </aside>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-72 bg-card shadow-xl">
              <div className="flex h-16 items-center justify-between border-b border-border px-4">
                <Link href="/" className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                    <Leaf className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="text-xl font-bold text-foreground">AgriAuct</span>
                </Link>
                <button onClick={() => setMobileMenuOpen(false)}>
                  <X className="h-6 w-6 text-foreground" />
                </button>
              </div>
              <nav className="p-4">
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-muted p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{user?.fullName || "Guest"}</div>
                    <div className="text-xs capitalize text-muted-foreground">{role}</div>
                  </div>
                </div>
                <div className="space-y-1">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
                <div className="mt-6 border-t border-border pt-4">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-5 w-5" />
                    Logout
                  </Button>
                </div>
              </nav>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
