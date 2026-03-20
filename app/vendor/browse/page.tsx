"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { Search, Filter, Clock, MapPin, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { DashboardLayout } from "@/components/dashboard-layout"
import {
  formatCurrency,
  formatTimeRemaining,
  getTimeRemainingMs,
  getCategoryLabel,
  categories,
  indianStates,
  type Listing,
  type Category,
} from "@/lib/mock-data"
import { supabase } from "@/lib/supabase"

type SortOption = "time" | "highest" | "newest" | "lowest"

export default function VendorBrowsePage() {
  const [, setTick] = useState(0)
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all")
  const [stateFilter, setStateFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<SortOption>("time")
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  // Load active listings from Supabase
  useEffect(() => {
    const loadListings = async () => {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "active")

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
  }, [])

  const activeListings = listings

  // Filter and sort listings
  const filteredListings = useMemo(() => {
    let result = [...activeListings]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (l) =>
          l.cropName.toLowerCase().includes(query) ||
          l.farmerName.toLowerCase().includes(query) ||
          l.district.toLowerCase().includes(query)
      )
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((l) => l.category === categoryFilter)
    }

    // State filter
    if (stateFilter !== "all") {
      result = result.filter((l) => l.state === stateFilter)
    }

    // Sort
    switch (sortBy) {
      case "time":
        result.sort((a, b) => getTimeRemainingMs(a.endTime) - getTimeRemainingMs(b.endTime))
        break
      case "highest":
        result.sort((a, b) => b.currentHighestBid - a.currentHighestBid)
        break
      case "lowest":
        result.sort((a, b) => a.currentHighestBid - b.currentHighestBid)
        break
      case "newest":
        result.sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
        break
    }

    return result
  }, [activeListings, searchQuery, categoryFilter, stateFilter, sortBy])

  const clearFilters = () => {
    setCategoryFilter("all")
    setStateFilter("all")
    setSearchQuery("")
  }

  const hasFilters = categoryFilter !== "all" || stateFilter !== "all" || searchQuery

  return (
    <DashboardLayout role="vendor">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Browse Auctions</h1>
          <p className="text-muted-foreground">
            Find and bid on agricultural produce from farmers across India
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search crops, farmers, locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Desktop Filters */}
          <div className="hidden items-center gap-3 lg:flex">
            <Select
              value={categoryFilter}
              onValueChange={(v) => setCategoryFilter(v as Category | "all")}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {indianStates.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">Ending Soon</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="highest">Highest Bid</SelectItem>
                <SelectItem value="lowest">Lowest Bid</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          {/* Mobile Filter Button */}
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden">
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {hasFilters && (
                  <Badge variant="secondary" className="ml-2">
                    Active
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <SheetHeader>
                <SheetTitle>Filter Auctions</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select
                    value={categoryFilter}
                    onValueChange={(v) => setCategoryFilter(v as Category | "all")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">State</label>
                  <Select value={stateFilter} onValueChange={setStateFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      {indianStates.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Sort By</label>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="time">Ending Soon</SelectItem>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="highest">Highest Bid</SelectItem>
                      <SelectItem value="lowest">Lowest Bid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      clearFilters()
                      setIsFilterOpen(false)
                    }}
                  >
                    Clear All
                  </Button>
                  <Button className="flex-1" onClick={() => setIsFilterOpen(false)}>
                    Apply Filters
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground">
          {isLoading
            ? "Loading auctions..."
            : `Showing ${filteredListings.length} of ${activeListings.length} active auctions`}
        </div>

        {/* Listings Grid */}
        {isLoading ? (
          <div className="py-12 text-center">
            <Search className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium text-foreground">Loading auctions…</p>
            <p className="mt-1 text-muted-foreground">
              Please wait while we fetch the latest auctions
            </p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="py-12 text-center">
            <Search className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium text-foreground">No auctions found</p>
            <p className="mt-1 text-muted-foreground">
              Try adjusting your filters or search terms
            </p>
            {hasFilters && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredListings.map((listing) => (
              <AuctionCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

function AuctionCard({ listing }: { listing: Listing }) {
  const timeRemaining = getTimeRemainingMs(listing.endTime)
  const isEnding = timeRemaining < 2 * 60 * 60 * 1000

  return (
    <Link href={`/auction/${listing.id}`}>
      <div className="group overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg">
        <div className="relative h-48 overflow-hidden">
          <Image
            src={listing.imageUrl}
            alt={listing.cropName}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
          {isEnding && (
            <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-destructive px-2 py-1 text-xs font-medium text-destructive-foreground">
              <Clock className="h-3 w-3" />
              Ending Soon
            </div>
          )}
          <div className="absolute bottom-2 right-2 rounded-full bg-background/90 px-2 py-1 text-xs font-medium">
            Grade {listing.qualityGrade}
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-foreground">{listing.cropName}</h3>
              <p className="text-sm text-muted-foreground">{getCategoryLabel(listing.category)}</p>
            </div>
            <Badge variant="outline">{listing.quantity} kg</Badge>
          </div>

          <div className="mt-3 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {listing.district}, {listing.state}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <div>
              <p className="text-xs text-muted-foreground">Current Bid</p>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(listing.currentHighestBid)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{listing.bidCount} bids</p>
              <p className={`text-sm font-medium ${isEnding ? "text-destructive" : "text-foreground"}`}>
                <Clock className="mr-1 inline h-3.5 w-3.5" />
                {formatTimeRemaining(listing.endTime)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
