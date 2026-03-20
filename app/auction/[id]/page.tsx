"use client"

import { useState, useEffect, useCallback } from "react"
import { use } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Clock, MapPin, User, Trophy, Gavel, TrendingUp } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/lib/auth-context"
import {
  formatCurrency,
  formatTimeRemaining,
  getTimeRemainingMs,
  getCategoryLabel,
  type Bid,
  type Listing,
} from "@/lib/mock-data"
import { supabase } from "@/lib/supabase"

export default function AuctionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { user } = useAuth()
  const [, setTick] = useState(0)
  const [bidAmount, setBidAmount] = useState("")
  const [isPlacingBid, setIsPlacingBid] = useState(false)
  const [localBids, setLocalBids] = useState<Bid[]>([])
  const [currentHighestBid, setCurrentHighestBid] = useState(0)
  const [listing, setListing] = useState<Listing | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load listing
  useEffect(() => {
    const loadListing = async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .single()

      if (error || !data) {
        console.error("Error loading listing", error)
        setListing(null)
        setIsLoading(false)
        return
      }

      const row: any = data
      const mapped: Listing = {
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
      }

      setListing(mapped)
      setCurrentHighestBid(mapped.currentHighestBid || mapped.startingPrice)
      setIsLoading(false)
    }

    loadListing()
  }, [id])

  // Load bids
  useEffect(() => {
    if (!listing) return

    const loadBids = async () => {
      const { data, error } = await supabase
        .from("bids")
        .select("*")
        .eq("listing_id", listing.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error loading bids", error)
        return
      }

      const mapped: Bid[] =
        data?.map((row: any) => ({
          id: row.id,
          listingId: row.listing_id,
          vendorId: row.vendor_id,
          vendorName: row.vendor_name,
          amount: Number(row.amount),
          createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        })) ?? []

      setLocalBids(mapped)
      if (mapped.length) {
        setCurrentHighestBid(Math.max(...mapped.map((b) => b.amount)))
      }
    }

    loadBids()
  }, [listing])

  // Update countdown timer every second
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  // Realtime: bids + listing changes
  useEffect(() => {
    if (!listing) return

    const channel = supabase
      .channel(`auction-${listing.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bids", filter: `listing_id=eq.${listing.id}` },
        (payload) => {
          const row: any = payload.new
          const newBid: Bid = {
            id: row.id,
            listingId: row.listing_id,
            vendorId: row.vendor_id,
            vendorName: row.vendor_name,
            amount: Number(row.amount),
            createdAt: row.created_at ? new Date(row.created_at) : new Date(),
          }
          setLocalBids((prev) => [newBid, ...prev])
          setCurrentHighestBid((prev) => Math.max(prev, newBid.amount))
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "listings", filter: `id=eq.${listing.id}` },
        (payload) => {
          const row: any = payload.new
          setListing((prev) =>
            prev
              ? {
                  ...prev,
                  status: row.status,
                  currentHighestBid: Number(row.current_highest_bid ?? prev.currentHighestBid),
                  bidCount: Number(row.bid_count ?? prev.bidCount),
                  winnerId: row.winner_id ?? prev.winnerId,
                  winnerName: row.winner_name ?? prev.winnerName,
                }
              : prev,
          )
          if (row.current_highest_bid != null) {
            setCurrentHighestBid(Number(row.current_highest_bid))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [listing])

  const handlePlaceBid = useCallback(async () => {
    if (!listing) return
    if (!user) {
      toast.error("Please login to place a bid")
      return
    }

    if (user.role !== "vendor") {
      toast.error("Only vendors can place bids")
      return
    }

    const amount = parseFloat(bidAmount)
    if (isNaN(amount) || amount <= currentHighestBid) {
      toast.error(`Bid must be higher than ${formatCurrency(currentHighestBid)}`)
      return
    }

    setIsPlacingBid(true)

    const { data, error } = await supabase
      .from("bids")
      .insert({
        listing_id: listing.id,
        vendor_id: user.id,
        vendor_name: user.fullName,
        amount,
      })
      .select()
      .single()

    if (error || !data) {
      toast.error(error?.message || "Failed to place bid")
      setIsPlacingBid(false)
      return
    }

    // Optimistically update listing summary
    await supabase
      .from("listings")
      .update({
        current_highest_bid: amount,
        bid_count: (listing.bidCount ?? 0) + 1,
      })
      .eq("id", listing.id)

    setBidAmount("")
    setIsPlacingBid(false)
    toast.success("Bid placed successfully!")
  }, [user, bidAmount, currentHighestBid, listing])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading auction...</p>
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Auction Not Found</h1>
          <p className="mt-2 text-muted-foreground">
            This auction may have been removed or does not exist.
          </p>
          <Button asChild className="mt-4">
            <Link href="/vendor/browse">Browse Auctions</Link>
          </Button>
        </div>
      </div>
    )
  }

  const timeRemaining = getTimeRemainingMs(listing.endTime)
  const isEnded = listing.status === "closed" || timeRemaining <= 0
  const isEnding = !isEnded && timeRemaining < 2 * 60 * 60 * 1000

  const minBidAmount = currentHighestBid + 1

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          <Link
            href={user?.role === "farmer" ? "/farmer/dashboard" : "/vendor/browse"}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <Separator orientation="vertical" className="h-6" />
          <h1 className="text-lg font-semibold text-foreground">{listing.cropName}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Product Details */}
          <div className="lg:col-span-2">
            {/* Product Image */}
            <div className="relative aspect-video overflow-hidden rounded-xl">
              <Image
                src={listing.imageUrl}
                alt={listing.cropName}
                fill
                className="object-cover"
                priority
              />
              {isEnded && (
                <div className="absolute inset-0 flex items-center justify-center bg-foreground/50">
                  <div className="rounded-lg bg-card p-6 text-center shadow-lg">
                    <Trophy className="mx-auto h-12 w-12 text-chart-5" />
                    <h2 className="mt-2 text-xl font-bold text-card-foreground">Auction Ended</h2>
                    <p className="mt-1 text-muted-foreground">
                      Winner: {listing.winnerName || "No bids placed"}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-primary">
                      {formatCurrency(currentHighestBid)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="mt-6 space-y-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold text-foreground">{listing.cropName}</h2>
                  <Badge variant="secondary">{getCategoryLabel(listing.category)}</Badge>
                  <Badge variant="outline">Grade {listing.qualityGrade}</Badge>
                </div>
                <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {listing.district}, {listing.state}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <InfoCard label="Quantity" value={`${listing.quantity} kg`} />
                <InfoCard label="Starting Price" value={formatCurrency(listing.startingPrice)} />
                <InfoCard label="Total Bids" value={localBids.length.toString()} />
                <InfoCard
                  label="Time Remaining"
                  value={isEnded ? "Ended" : formatTimeRemaining(listing.endTime)}
                  highlight={isEnding}
                />
              </div>

              {/* Farmer Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Seller Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{listing.farmerName}</p>
                      <p className="text-sm text-muted-foreground">
                        {listing.district}, {listing.state}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column - Bidding Section */}
          <div className="space-y-6">
            {/* Current Bid Card */}
            <Card className={isEnding ? "border-destructive" : ""}>
              <CardContent className="p-6">
                <div className="text-center">
                  {isEnding && !isEnded && (
                    <div className="mb-4 flex items-center justify-center gap-2 text-destructive">
                      <Clock className="h-5 w-5" />
                      <span className="font-semibold">Ending Soon!</span>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {isEnded ? "Final Price" : "Current Highest Bid"}
                  </p>
                  <p className="mt-1 text-4xl font-bold text-primary">
                    {formatCurrency(currentHighestBid)}
                  </p>
                  {!isEnded && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      <Clock className="mr-1 inline h-4 w-4" />
                      {formatTimeRemaining(listing.endTime)} remaining
                    </p>
                  )}
                </div>

                {/* Bid Input */}
                {!isEnded && user?.role === "vendor" && (
                  <div className="mt-6 space-y-3">
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder={`Min: ${formatCurrency(minBidAmount)}`}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        min={minBidAmount}
                        className="text-lg"
                      />
                      <Button
                        onClick={handlePlaceBid}
                        disabled={isPlacingBid || !bidAmount}
                        className="shrink-0"
                      >
                        {isPlacingBid ? "Placing..." : "Place Bid"}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      {[100, 250, 500].map((increment) => (
                        <Button
                          key={increment}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setBidAmount((currentHighestBid + increment).toString())}
                        >
                          +{formatCurrency(increment)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {!isEnded && user?.role === "farmer" && (
                  <p className="mt-4 text-center text-sm text-muted-foreground">
                    You cannot bid on auctions as a farmer
                  </p>
                )}

                {!isEnded && !user && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Please login as a vendor to place bids
                    </p>
                    <Button asChild variant="outline" className="mt-2">
                      <Link href="/auth/login">Login</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live Bid Feed */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Gavel className="h-4 w-4" />
                  Live Bid Feed
                  <span className="ml-auto flex h-2 w-2 rounded-full bg-success" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-80">
                  {localBids.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      No bids yet. Be the first to bid!
                    </div>
                  ) : (
                    <div className="space-y-0">
                      {localBids.map((bid, index) => (
                        <BidItem
                          key={bid.id}
                          bid={bid}
                          isHighest={index === 0}
                          isOwn={bid.vendorId === user?.id}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Mobile Fixed Bid Bar */}
      {!isEnded && user?.role === "vendor" && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card p-4 lg:hidden">
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              <p className="text-xs text-muted-foreground">Current</p>
              <p className="font-bold text-primary">{formatCurrency(currentHighestBid)}</p>
            </div>
            <Input
              type="number"
              placeholder={`Min: ${formatCurrency(minBidAmount)}`}
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              min={minBidAmount}
              className="flex-1"
            />
            <Button onClick={handlePlaceBid} disabled={isPlacingBid || !bidAmount}>
              Bid
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoCard({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-semibold ${highlight ? "text-destructive" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  )
}

function BidItem({ bid, isHighest, isOwn }: { bid: Bid; isHighest: boolean; isOwn: boolean }) {
  const timeAgo = getTimeAgo(bid.createdAt)

  return (
    <div
      className={`flex items-center justify-between border-b border-border px-4 py-3 last:border-0 ${
        isHighest ? "bg-primary/5" : ""
      } ${isOwn ? "bg-accent/30" : ""}`}
    >
      <div className="flex items-center gap-3">
        {isHighest && <TrendingUp className="h-4 w-4 text-primary" />}
        <div>
          <p className="font-medium text-foreground">
            {bid.vendorName}
            {isOwn && <span className="ml-1 text-xs text-muted-foreground">(You)</span>}
          </p>
          <p className="text-xs text-muted-foreground">{timeAgo}</p>
        </div>
      </div>
      <p className={`font-bold ${isHighest ? "text-primary" : "text-foreground"}`}>
        {formatCurrency(bid.amount)}
      </p>
    </div>
  )
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) return "Just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
