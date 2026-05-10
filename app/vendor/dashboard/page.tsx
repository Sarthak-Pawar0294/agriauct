"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Search, TrendingUp, Trophy, Gavel, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/lib/auth-context"
import {
  formatCurrency,
  formatTimeRemaining,
  getTimeRemainingMs,
  type Listing,
  type Bid,
} from "@/lib/mock-data"
import { supabase } from "@/lib/supabase"

export default function VendorDashboard() {
  const { user } = useAuth()
  const [, setTick] = useState(0)
  const [vendorBids, setVendorBids] = useState<Bid[]>([])
  const [participatedListings, setParticipatedListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!user?.id) return

    const loadData = async () => {
      setIsLoading(true)

      // Bids by this vendor
      const { data: bidsData, error: bidsError } = await supabase
        .from("bids")
        .select("*")
        .eq("vendor_id", user.id)

      if (bidsError) {
        console.error("Error loading bids", bidsError)
        setIsLoading(false)
        return
      }

      const mappedBids: Bid[] =
        bidsData?.map((row: any) => ({
          id: row.id,
          listingId: row.listing_id,
          vendorId: row.vendor_id,
          vendorName: row.vendor_name,
          amount: Number(row.amount),
          createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        })) ?? []

      setVendorBids(mappedBids)

      const listingIds = Array.from(new Set(mappedBids.map((b) => b.listingId)))
      if (listingIds.length === 0) {
        setParticipatedListings([])
        setIsLoading(false)
        return
      }

      const { data: listingsData, error: listingsError } = await supabase
        .from("listings")
        .select("*")
        .in("id", listingIds)

      if (listingsError) {
        console.error("Error loading listings", listingsError)
        setIsLoading(false)
        return
      }

      const mappedListings: Listing[] =
        listingsData?.map((row: any) => ({
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

      setParticipatedListings(mappedListings)
      setIsLoading(false)
    }

    loadData()
  }, [user?.id])

  const vendorId = user?.id ?? ""
  const activeParticipations = participatedListings.filter((l) => l.status === "active")
  const wonAuctions = participatedListings.filter(
    (l) => l.status === "closed" && l.winnerId === vendorId
  )

  // Get vendor's highest bid per listing
  const getHighestBid = (listingId: string) => {
    const bids = vendorBids.filter((b) => b.listingId === listingId)
    return Math.max(...bids.map((b) => b.amount), 0)
  }

  // Check if vendor is winning
  const isWinning = (listing: Listing) => {
    const highestBid = getHighestBid(listing.id)
    return highestBid === listing.currentHighestBid
  }

  // Stats
  const totalBidsPlaced = vendorBids.length
  const totalSpent = wonAuctions.reduce((sum, l) => sum + l.currentHighestBid, 0)

  return (
    <DashboardLayout role="vendor">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Vendor Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.fullName || "Amit Patel"}
            </p>
          </div>
          <Button asChild>
            <Link href="/vendor/browse">
              <Search className="mr-2 h-4 w-4" />
              Browse Auctions
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Active Bids"
            value={isLoading ? "—" : activeParticipations.length}
            icon={Gavel}
            iconColor="text-primary"
          />
          <StatsCard
            title="Total Bids Placed"
            value={isLoading ? "—" : totalBidsPlaced}
            icon={TrendingUp}
            iconColor="text-chart-2"
          />
          <StatsCard
            title="Auctions Won"
            value={isLoading ? "—" : wonAuctions.length}
            icon={Trophy}
            iconColor="text-chart-5"
          />
          <StatsCard
            title="Total Spent"
            value={isLoading ? "—" : formatCurrency(totalSpent)}
            icon={TrendingUp}
            iconColor="text-success"
          />
        </div>

        {/* Active Participations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Your Active Bids</CardTitle>
            <Link
              href="/vendor/bids"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading your bids...</div>
            ) : activeParticipations.length === 0 ? (
              <div className="py-8 text-center">
                <Gavel className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-muted-foreground">No active bids</p>
                <Button asChild className="mt-4" variant="outline">
                  <Link href="/vendor/browse">Browse auctions</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeParticipations.map((listing) => (
                  <ActiveBidCard
                    key={listing.id}
                    listing={listing}
                    yourBid={getHighestBid(listing.id)}
                    isWinning={isWinning(listing)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Won Auctions */}
        <Card>
          <CardHeader>
            <CardTitle>Auctions Won</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading your bids...</div>
            ) : wonAuctions.length === 0 ? (
              <div className="py-8 text-center">
                <Trophy className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-muted-foreground">No auctions won yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {wonAuctions.map((listing) => (
                  <WonAuctionCard key={listing.id} listing={listing} />
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

function ActiveBidCard({
  listing,
  yourBid,
  isWinning,
}: {
  listing: Listing
  yourBid: number
  isWinning: boolean
}) {
  const timeRemaining = getTimeRemainingMs(listing.endTime)
  const isEnding = timeRemaining < 2 * 60 * 60 * 1000

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
          {isWinning ? (
            <Badge className="bg-success text-success-foreground">Winning</Badge>
          ) : (
            <Badge variant="destructive">Outbid</Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>{listing.farmerName}</span>
          <span>{listing.state}</span>
          <span className={isEnding ? "font-medium text-destructive" : ""}>
            <Clock className="mr-1 inline h-3.5 w-3.5" />
            {formatTimeRemaining(listing.endTime)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Your Bid</p>
          <p className="font-semibold text-foreground">{formatCurrency(yourBid)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Highest</p>
          <p className="font-bold text-primary">{formatCurrency(listing.currentHighestBid)}</p>
        </div>
        <Link href={`/auction/${listing.id}`}>
          <Button variant={isWinning ? "outline" : "default"} size="sm">
            {isWinning ? "View" : "Bid Now"}
          </Button>
        </Link>
      </div>
    </div>
  )
}

function WonAuctionCard({ listing }: { listing: Listing }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-success/5 p-4 sm:flex-row sm:items-center">
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
          <Badge className="bg-success text-success-foreground">Won</Badge>
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          Seller: {listing.farmerName} - {listing.district}, {listing.state}
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
