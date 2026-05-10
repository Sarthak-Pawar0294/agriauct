"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Upload, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { useSubmit } from "@/hooks/useSubmit"
import { categories, qualityGrades, indianStates, type Category, type QualityGrade } from "@/lib/mock-data"

export default function CreateAuctionPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { isSubmitting, execute } = useSubmit()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => { setIsMounted(true) }, [])

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUrlInput, setImageUrlInput] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [formData, setFormData] = useState({
    cropName: "",
    category: "" as Category | "",
    quantity: "",
    qualityGrade: "" as QualityGrade | "",
    state: "",
    district: "",
    startingPrice: "",
    description: "",
  })

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImagePreview(null)
    setImageFile(null)
    setImageUrlInput("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) {
      toast.error("You must be logged in as a farmer to create an auction")
      return
    }

    const hasFile = !!imageFile
    const hasUrl = imageUrlInput.trim() !== ""

    // Image validation
    if (!hasFile && !hasUrl) {
      toast.error("Please upload an image file or paste an image URL.")
      return
    }
    if (hasFile && hasUrl) {
      toast.error("Please provide either an image file or a URL — not both.")
      return
    }

    // Time validation
    if (!startTime) {
      toast.error("Please set a Start Time for the auction.")
      return
    }
    if (!endTime) {
      toast.error("Please set an End Time for the auction.")
      return
    }

    const startMs = new Date(startTime).getTime()
    const endMs   = new Date(endTime).getTime()
    const nowMs   = Date.now()

    // Allow up to 60 seconds in the past to account for the time
    // a farmer spends filling in the rest of the form.
    if (startMs < nowMs - 60_000) {
      toast.error("Start Time cannot be in the past.")
      return
    }
    if (endMs <= startMs) {
      toast.error("End Time must be after Start Time.")
      return
    }

    await execute(async () => {
      let imageUrl: string | null = null

      if (hasFile) {
        // Upload physical file to Supabase Storage
        const filePath = `${user.id}/${Date.now()}-${imageFile!.name}`
        const { error: uploadError } = await supabase.storage
          .from("produce-images")
          .upload(filePath, imageFile!)

        if (uploadError) {
          console.error("Storage upload error:", uploadError)
          throw new Error(uploadError.message || "Failed to upload image. Please try again.")
        }

        const { data: publicUrlData } = supabase.storage
          .from("produce-images")
          .getPublicUrl(filePath)

        if (!publicUrlData?.publicUrl) {
          throw new Error("Could not get a public URL for the uploaded image.")
        }

        imageUrl = publicUrlData.publicUrl
      } else {
        // Use the pasted external URL directly — no storage upload needed
        imageUrl = imageUrlInput.trim()
      }

      const startDate     = new Date(startTime)
      const endDate       = new Date(endTime)
      const durationHours = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)))

      const { error: insertError } = await supabase.from("listings").insert({
        farmer_id: user.id,
        farmer_name: user.fullName,
        crop_name: formData.cropName,
        category: formData.category,
        quantity: Number(formData.quantity),
        quality_grade: formData.qualityGrade,
        state: formData.state,
        district: formData.district,
        starting_price: Number(formData.startingPrice),
        current_highest_bid: Number(formData.startingPrice),
        auction_duration: durationHours,
        start_time: startDate.toISOString(),
        end_time:   endDate.toISOString(),
        status: "active",
        image_url: imageUrl,
        bid_count: 0,
      })

      if (insertError) {
        console.error("Listing insert error:", insertError)
        throw new Error(insertError.message || "Failed to create auction listing. Please try again.")
      }

      // Reset all form state on success
      setFormData({
        cropName: "",
        category: "" as Category | "",
        quantity: "",
        qualityGrade: "" as QualityGrade | "",
        state: "",
        district: "",
        startingPrice: "",
        description: "",
      })
      setStartTime("")
      setEndTime("")
      setImageFile(null)
      setImagePreview(null)
      setImageUrlInput("")

      toast.success("Auction created successfully!")
      router.push("/farmer/dashboard")
    })
  }

  if (!isMounted) return null

  return (
    <DashboardLayout role="farmer">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link
            href="/farmer/dashboard"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create New Auction</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Image Upload */}
              <div className="space-y-3">
                <Label>Produce Image <span className="text-destructive">*</span></Label>

                {/* Drag-and-drop file upload */}
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-48 w-full rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute right-2 top-2 rounded-full bg-background/80 p-1 hover:bg-background"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    className={`flex h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/30 hover:bg-muted/50 transition-colors ${
                      imageUrlInput.trim()
                        ? "border-border opacity-40 pointer-events-none"
                        : "border-border"
                    }`}
                  >
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <span className="mt-2 text-sm text-muted-foreground">
                      Click to upload image
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                      disabled={!!imageUrlInput.trim()}
                    />
                  </label>
                )}

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">or</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* External URL input */}
                <div className="space-y-1">
                  <Label htmlFor="imageUrlInput" className="text-sm font-normal text-muted-foreground">
                    Paste an Image URL
                  </Label>
                  <Input
                    id="imageUrlInput"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    disabled={!!imageFile}
                    className={imageFile ? "opacity-40 cursor-not-allowed" : ""}
                  />
                  {imageFile && (
                    <p className="text-xs text-muted-foreground">
                      Remove the uploaded file first to use a URL instead.
                    </p>
                  )}
                </div>
              </div>

              {/* Crop Name */}
              <div className="space-y-2">
                <Label htmlFor="cropName">Crop Name</Label>
                <Input
                  id="cropName"
                  placeholder="e.g., Organic Wheat, Fresh Tomatoes"
                  value={formData.cropName}
                  onChange={(e) => setFormData({ ...formData, cropName: e.target.value })}
                  required
                />
              </div>

              {/* Category & Quality */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: Category) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quality Grade</Label>
                  <Select
                    value={formData.qualityGrade}
                    onValueChange={(value: QualityGrade) =>
                      setFormData({ ...formData, qualityGrade: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {qualityGrades.map((grade) => (
                        <SelectItem key={grade.value} value={grade.value}>
                          {grade.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity (kg)</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="Enter quantity in kilograms"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  min="1"
                  required
                />
              </div>

              {/* Location */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>State</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => setFormData({ ...formData, state: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
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
                <div className="space-y-2">
                  <Label htmlFor="district">District</Label>
                  <Input
                    id="district"
                    placeholder="Enter district"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Price */}
              <div className="space-y-2">
                <label htmlFor="startingPrice" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Starting Price (Rs.)
                </label>
                <Input
                  id="startingPrice"
                  type="number"
                  placeholder="Enter starting bid"
                  value={formData.startingPrice}
                  onChange={(e) => setFormData({ ...formData, startingPrice: e.target.value })}
                  min="1"
                  required
                />
              </div>

              {/* Auction Schedule */}
              {(() => {
                // Compute a live duration hint whenever both fields are filled
                const durationHint = (() => {
                  if (!startTime || !endTime) return null
                  const diffMs = new Date(endTime).getTime() - new Date(startTime).getTime()
                  if (diffMs <= 0) return null
                  const totalMins = Math.round(diffMs / 60_000)
                  const h = Math.floor(totalMins / 60)
                  const m = totalMins % 60
                  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`
                })()

                // Compute the min value for the datetime-local input: now rounded up to the minute
                const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
                  .toISOString()
                  .slice(0, 16)

                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium leading-none">
                        Auction Schedule
                      </span>
                      {durationHint && (
                        <span className="text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5">
                          Duration: {durationHint}
                        </span>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label
                          htmlFor="startTime"
                          className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                        >
                          Start Time
                        </label>
                        <input
                          id="startTime"
                          type="datetime-local"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          min={nowLocal}
                          required
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [color-scheme:auto]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label
                          htmlFor="endTime"
                          className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                        >
                          End Time
                        </label>
                        <input
                          id="endTime"
                          type="datetime-local"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          min={startTime || nowLocal}
                          required
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [color-scheme:auto]"
                        />
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Add any additional details about your produce..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Auction"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
