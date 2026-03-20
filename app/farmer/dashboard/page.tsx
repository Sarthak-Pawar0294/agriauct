"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Plus, TrendingUp, Clock, Gavel, Trophy, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/lib/auth-context"
import { formatCurrency, formatTimeRemaining, getTimeRemainingMs, type Listing } from "@/lib/mock-data"
import { supabase } from "@/lib/supabase"

export default function FarmerDashboard() {
  const { user } = useAuth()
  const [, setTick] = useState(0)
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Update countdown timers every second
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  // Load listings for current farmer from Supabase
  useEffect(() => {
    if (!user?.id) return

    const loadListings = async () => {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("farmer_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error loading listings", error)
        setIsLoading(false)
        return
      }

      const mapped: Listing[] =
        data?.map((row: any) => ({
          id: row.id,
          farmerId: row.farmer_id,
          farmerName: row.farmer_name ?? "",
          cropName: row.crop_name,
          category: row.category,
          quantity: Number(row.quantity ?? 0),
          qualityGrade: row.quality_grade,
          state: row.state,
          district: row.district,
          startingPrice: Number(row.starting_price ?? 0),
          currentHighestBid: Number(row.current_highest_bid ?? 0),
          auctionDuration: Number(row.auction_duration ?? 0),
          startTime: row.start_time ? new Date(row.start_time) : new Date(),
          endTime: row.end_time ? new Date(row.end_time) : new Date(),
          status: row.status,
          imageUrl: row.image_url ?? "",
          bidCount: Number(row.bid_count ?? 0),
          winnerId: row.winner_id ?? undefined,
          winnerName: row.winner_name ?? undefined,
        })) ?? []

      setListings(mapped)
      setIsLoading(false)
    }

    loadListings()
  }, [user?.id])

  const farmerListings = listings
  const activeListings = farmerListings.filter((l) => l.status === "active")
  const closedListings = farmerListings.filter((l) => l.status === "closed")

  // Stats
  const totalBids = farmerListings.reduce((sum, l) => sum + l.bidCount, 0)
  const totalEarnings = closedListings.reduce((sum, l) => sum + l.currentHighestBid, 0)

  return (
    <DashboardLayout role="farmer">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Farmer Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.fullName || "Rajesh Kumar"}
            </p>
          </div>
          <Button asChild>
            <Link href="/farmer/auctions/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Auction
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Active Auctions"
            value={isLoading ? "—" : activeListings.length}
            icon={Gavel}
            iconColor="text-primary"
          />
          <StatsCard
            title="Total Bids"
            value={isLoading ? "—" : totalBids}
            icon={TrendingUp}
            iconColor="text-chart-2"
          />
          <StatsCard
            title="Closed Auctions"
            value={isLoading ? "—" : closedListings.length}
            icon={Trophy}
            iconColor="text-chart-5"
          />
          <StatsCard
            title="Total Earnings"
            value={isLoading ? "—" : formatCurrency(totalEarnings)}
            icon={TrendingUp}
            iconColor="text-success"
          />
        </div>

        {/* Active Auctions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Active Auctions</CardTitle>
            <Link
              href="/farmer/auctions"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading auctions...</div>
            ) : activeListings.length === 0 ? (
              <div className="py-8 text-center">
                <Gavel className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-muted-foreground">No active auctions</p>
                <Button asChild className="mt-4" variant="outline">
                  <Link href="/farmer/auctions/new">Create your first auction</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeListings.map((listing) => (
                  <ActiveAuctionCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Closed Auctions */}
        <Card>
          <CardHeader>
            <CardTitle>Recently Closed Auctions</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading auctions...</div>
            ) : closedListings.length === 0 ? (
              <div className="py-8 text-center">
                <Trophy className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-muted-foreground">No closed auctions yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {closedListings.map((listing) => (
                  <ClosedAuctionCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

function StatsCard({
  title,
  value,
  icon: Icon,
  iconColor,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  iconColor: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
          </div>
          <div className={`rounded-full bg-muted p-3 ${iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ActiveAuctionCard({ listing }: { listing: Listing }) {
  const timeRemaining = getTimeRemainingMs(listing.endTime)
  const isEnding = timeRemaining < 2 * 60 * 60 * 1000 // Less than 2 hours

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
        <Image
          src={listing.imageUrl}
          alt={listing.cropName}
          fill
          className="object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-foreground">{listing.cropName}</h3>
          <Badge variant="secondary" className="text-xs">
            {listing.quantity} kg
          </Badge>
          <Badge variant="outline" className="text-xs">
            Grade {listing.qualityGrade}
          </Badge>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>{listing.bidCount} bids</span>
          <span className={isEnding ? "font-medium text-destructive" : ""}>
            <Clock className="mr-1 inline h-3.5 w-3.5" />
            {formatTimeRemaining(listing.endTime)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4 sm:text-right">
        <div>
          <p className="text-sm text-muted-foreground">Current Bid</p>
          <p className="text-lg font-bold text-primary">
            {formatCurrency(listing.currentHighestBid)}
          </p>
        </div>
        <Link href={`/auction/${listing.id}`}>
          <Button variant="outline" size="sm">
            View
          </Button>
        </Link>
      </div>
    </div>
  )
}

function ClosedAuctionCard({ listing }: { listing: Listing }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:items-center">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
        <Image
          src={listing.imageUrl}
          alt={listing.cropName}
          fill
          className="object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-foreground">{listing.cropName}</h3>
          <Badge className="bg-success text-success-foreground">Sold</Badge>
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          Won by: <span className="font-medium text-foreground">{listing.winnerName}</span>
        </div>
      </div>
      <div className="sm:text-right">
        <p className="text-sm text-muted-foreground">Final Price</p>
        <p className="text-lg font-bold text-foreground">
          {formatCurrency(listing.currentHighestBid)}
        </p>
      </div>
    </div>
  )
}
