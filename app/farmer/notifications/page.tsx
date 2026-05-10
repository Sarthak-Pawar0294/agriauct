"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Bell, Check, TrendingUp, Trophy, Gavel } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/lib/auth-context"
import { type Notification } from "@/lib/mock-data"
import { supabase } from "@/lib/supabase"

export default function FarmerNotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    if (!user?.id) return

    const loadNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error loading notifications", error)
        return
      }

      setNotifications(
        (data ?? []).map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          message: row.message,
          isRead: row.is_read,
          createdAt: new Date(row.created_at),
          type: row.type,
          listingId: row.listing_id ?? undefined,
        })),
      )
    }

    loadNotifications()
  }, [user?.id])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    )
    await supabase.from("notifications").update({ is_read: true }).eq("id", id)
  }

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    if (user?.id) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
    }
  }

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "new_bid":
        return <TrendingUp className="h-5 w-5 text-primary" />
      case "auction_ended":
        return <Trophy className="h-5 w-5 text-chart-5" />
      case "won":
        return <Trophy className="h-5 w-5 text-success" />
      case "outbid":
        return <Gavel className="h-5 w-5 text-destructive" />
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    if (seconds < 60) return "Just now"
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  return (
    <DashboardLayout role="farmer">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread notifications` : "All caught up!"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <Check className="mr-2 h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 transition-colors hover:bg-muted/50 ${
                      !notification.isRead ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="mt-1 shrink-0">{getIcon(notification.type)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground">{notification.message}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {getTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {notification.listingId && (
                        <Link href={`/auction/${notification.listingId}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      )}
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
