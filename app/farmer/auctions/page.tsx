"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Plus, Clock, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/lib/auth-context"
import {
  formatCurrency,
  formatTimeRemaining,
  getTimeRemainingMs,
  getCategoryLabel,
  type Listing,
} from "@/lib/mock-data"
import { supabase } from "@/lib/supabase"

export default function FarmerAuctionsPage() {
  const { user } = useAuth()
  const [, setTick] = useState(0)
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  // Load listings for current farmer
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
        console.error("Error loading farmer listings", error)
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

  const handleCloseAuction = async (listingId: string) => {
    const { error } = await supabase
      .from("listings")
      .update({ status: "closed", end_time: new Date().toISOString() })
      .eq("id", listingId)

    if (error) {
      toast.error(error.message || "Failed to close auction")
      return
    }

    toast.success("Auction closed successfully")
    setListings((prev) =>
      prev.map((l) => (l.id === listingId ? { ...l, status: "closed" } : l)),
    )
  }

  return (
    <DashboardLayout role="farmer">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Auctions</h1>
            <p className="text-muted-foreground">Manage all your auction listings</p>
          </div>
          <Button asChild>
            <Link href="/farmer/auctions/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Auction
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="active">
              Active ({isLoading ? "…" : activeListings.length})
            </TabsTrigger>
            <TabsTrigger value="closed">
              Closed ({isLoading ? "…" : closedListings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {isLoading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Loading auctions...</p>
                </CardContent>
              </Card>
            ) : activeListings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No active auctions</p>
                  <Button asChild className="mt-4" variant="outline">
                    <Link href="/farmer/auctions/new">Create your first auction</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {activeListings.map((listing) => (
                  <AuctionCard
                    key={listing.id}
                    listing={listing}
                    onClose={handleCloseAuction}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="closed" className="mt-6">
            {isLoading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Loading auctions...</p>
                </CardContent>
              </Card>
            ) : closedListings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No closed auctions yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {closedListings.map((listing) => (
                  <ClosedAuctionCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

function AuctionCard({
  listing,
  onClose,
}: {
  listing: Listing
  onClose: (id: string) => void
}) {
  const timeRemaining = getTimeRemainingMs(listing.endTime)
  const isEnding = timeRemaining < 2 * 60 * 60 * 1000

  return (
    <Card>
      <div className="relative h-48 overflow-hidden rounded-t-lg">
        <Image
          src={listing.imageUrl}
          alt={listing.cropName}
          fill
          className="object-cover"
        />
        {isEnding && (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-destructive px-2 py-1 text-xs font-medium text-destructive-foreground">
            <AlertTriangle className="h-3 w-3" />
            Ending Soon
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-foreground">{listing.cropName}</h3>
            <p className="text-sm text-muted-foreground">{getCategoryLabel(listing.category)}</p>
          </div>
          <Badge variant="outline">Grade {listing.qualityGrade}</Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Quantity</p>
            <p className="font-medium text-foreground">{listing.quantity} kg</p>
          </div>
          <div>
            <p className="text-muted-foreground">Bids</p>
            <p className="font-medium text-foreground">{listing.bidCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Current Bid</p>
            <p className="font-bold text-primary">{formatCurrency(listing.currentHighestBid)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Time Left</p>
            <p className={`font-medium ${isEnding ? "text-destructive" : "text-foreground"}`}>
              <Clock className="mr-1 inline h-3.5 w-3.5" />
              {formatTimeRemaining(listing.endTime)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/auction/${listing.id}`}>View Details</Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                Close Early
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Close Auction Early?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will end the auction immediately. The current highest bidder (
                  {formatCurrency(listing.currentHighestBid)}) will win. This action cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onClose(listing.id)}>
                  Close Auction
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}

function ClosedAuctionCard({ listing }: { listing: Listing }) {
  return (
    <Card className="bg-muted/30">
      <div className="relative h-48 overflow-hidden rounded-t-lg">
        <Image
          src={listing.imageUrl}
          alt={listing.cropName}
          fill
          className="object-cover opacity-80"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-foreground/20">
          <Badge className="bg-success text-success-foreground">Sold</Badge>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-foreground">{listing.cropName}</h3>
            <p className="text-sm text-muted-foreground">{getCategoryLabel(listing.category)}</p>
          </div>
          <Badge variant="outline">Grade {listing.qualityGrade}</Badge>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Final Price</span>
            <span className="font-bold text-foreground">
              {formatCurrency(listing.currentHighestBid)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Winner</span>
            <span className="font-medium text-foreground">{listing.winnerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Bids</span>
            <span className="font-medium text-foreground">{listing.bidCount}</span>
          </div>
        </div>

        <Button asChild variant="outline" className="mt-4 w-full">
          <Link href={`/auction/${listing.id}`}>View Details</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
