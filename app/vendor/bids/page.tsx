"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { History, Clock, Trophy, XCircle, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/lib/auth-context"
import {
  formatCurrency,
  formatTimeRemaining,
  getTimeRemainingMs,
  getCategoryLabel,
  type Listing,
  type Bid,
} from "@/lib/mock-data"
import { supabase } from "@/lib/supabase"

export default function VendorBidHistoryPage() {
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

  // Categorize listings
  const activeListings = participatedListings.filter((l) => l.status === "active")
  const wonListings = participatedListings.filter(
    (l) => l.status === "closed" && l.winnerId === vendorId
  )
  const lostListings = participatedListings.filter(
    (l) => l.status === "closed" && l.winnerId !== vendorId
  )

  // Get vendor's highest bid for a listing
  const getHighestBid = (listingId: string) => {
    const bids = vendorBids.filter((b) => b.listingId === listingId)
    return Math.max(...bids.map((b) => b.amount), 0)
  }

  // Check if vendor is currently winning
  const isWinning = (listing: Listing) => {
    const highestBid = getHighestBid(listing.id)
    return highestBid === listing.currentHighestBid
  }

  // Get bid count for a listing
  const getBidCount = (listingId: string) => {
    return vendorBids.filter((b) => b.listingId === listingId).length
  }

  return (
    <DashboardLayout role="vendor">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bid History</h1>
          <p className="text-muted-foreground">
            Track all your auction participations and outcomes
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-primary/10 p-3">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Bids</p>
                <p className="text-2xl font-bold text-foreground">
                  {isLoading ? "—" : activeListings.length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-success/10 p-3">
                <Trophy className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Auctions Won</p>
                <p className="text-2xl font-bold text-foreground">
                  {isLoading ? "—" : wonListings.length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-muted p-3">
                <XCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Auctions Lost</p>
                <p className="text-2xl font-bold text-foreground">
                  {isLoading ? "—" : lostListings.length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="active">
              Active ({isLoading ? "…" : activeListings.length})
            </TabsTrigger>
            <TabsTrigger value="won">
              Won ({isLoading ? "…" : wonListings.length})
            </TabsTrigger>
            <TabsTrigger value="lost">
              Lost ({isLoading ? "…" : lostListings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {isLoading ? (
              <EmptyState
                icon={Clock}
                title="Loading bids"
                description="Please wait while we load your bid history"
              />
            ) : activeListings.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No active bids"
                description="Start bidding on auctions to see them here"
                actionLabel="Browse Auctions"
                actionHref="/vendor/browse"
              />
            ) : (
              <div className="space-y-4">
                {activeListings.map((listing) => (
                  <BidCard
                    key={listing.id}
                    listing={listing}
                    yourBid={getHighestBid(listing.id)}
                    bidCount={getBidCount(listing.id)}
                    status={isWinning(listing) ? "winning" : "outbid"}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="won" className="mt-6">
            {isLoading ? (
              <EmptyState
                icon={Trophy}
                title="Loading bids"
                description="Please wait while we load your bid history"
              />
            ) : wonListings.length === 0 ? (
              <EmptyState
                icon={Trophy}
                title="No auctions won yet"
                description="Keep bidding to win your first auction"
                actionLabel="Browse Auctions"
                actionHref="/vendor/browse"
              />
            ) : (
              <div className="space-y-4">
                {wonListings.map((listing) => (
                  <BidCard
                    key={listing.id}
                    listing={listing}
                    yourBid={getHighestBid(listing.id)}
                    bidCount={getBidCount(listing.id)}
                    status="won"
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="lost" className="mt-6">
            {isLoading ? (
              <EmptyState
                icon={History}
                title="Loading bids"
                description="Please wait while we load your bid history"
              />
            ) : lostListings.length === 0 ? (
              <EmptyState
                icon={History}
                title="No lost auctions"
                description="Your bid history will appear here"
              />
            ) : (
              <div className="space-y-4">
                {lostListings.map((listing) => (
                  <BidCard
                    key={listing.id}
                    listing={listing}
                    yourBid={getHighestBid(listing.id)}
                    bidCount={getBidCount(listing.id)}
                    status="lost"
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: React.ElementType
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
}) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <Icon className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-muted-foreground">{description}</p>
        {actionLabel && actionHref && (
          <Button asChild variant="outline" className="mt-4">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function BidCard({
  listing,
  yourBid,
  bidCount,
  status,
}: {
  listing: Listing
  yourBid: number
  bidCount: number
  status: "winning" | "outbid" | "won" | "lost"
}) {
  const timeRemaining = getTimeRemainingMs(listing.endTime)
  const isEnding = status === "winning" || status === "outbid" ? timeRemaining < 2 * 60 * 60 * 1000 : false

  const statusConfig = {
    winning: { badge: "Winning", color: "bg-success text-success-foreground" },
    outbid: { badge: "Outbid", color: "bg-destructive text-destructive-foreground" },
    won: { badge: "Won", color: "bg-success text-success-foreground" },
    lost: { badge: "Lost", color: "bg-muted text-muted-foreground" },
  }

  return (
    <Card className={status === "lost" ? "bg-muted/30" : ""}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg">
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
              <Badge className={statusConfig[status].color}>{statusConfig[status].badge}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {getCategoryLabel(listing.category)} - {listing.quantity} kg - Grade {listing.qualityGrade}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {listing.farmerName} - {listing.district}, {listing.state}
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Your Bid</p>
              <p className="font-semibold text-foreground">{formatCurrency(yourBid)}</p>
              <p className="text-xs text-muted-foreground">{bidCount} bids placed</p>
            </div>

            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                {listing.status === "active" ? "Current" : "Final"}
              </p>
              <p className="font-bold text-primary">{formatCurrency(listing.currentHighestBid)}</p>
              {listing.status === "active" && (
                <p className={`text-xs ${isEnding ? "text-destructive" : "text-muted-foreground"}`}>
                  <Clock className="mr-1 inline h-3 w-3" />
                  {formatTimeRemaining(listing.endTime)}
                </p>
              )}
            </div>

            <Link href={`/auction/${listing.id}`}>
              <Button
                variant={status === "outbid" ? "default" : "outline"}
                size="sm"
              >
                {status === "outbid" ? "Bid Now" : "View"}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
