"use client"

import { useState } from "react"
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
import { categories, qualityGrades, indianStates, type Category, type QualityGrade } from "@/lib/mock-data"

export default function CreateAuctionPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    cropName: "",
    category: "" as Category | "",
    quantity: "",
    qualityGrade: "" as QualityGrade | "",
    state: "",
    district: "",
    startingPrice: "",
    auctionDuration: "24",
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
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) {
      toast.error("You must be logged in as a farmer to create an auction")
      return
    }

    setIsSubmitting(true)

    try {
      let imageUrl: string | null = null

      if (imageFile) {
        const filePath = `${user.id}/${Date.now()}-${imageFile.name}`
        const { error: uploadError } = await supabase.storage
          .from("produce-images")
          .upload(filePath, imageFile)

        if (uploadError) {
          throw uploadError
        }

        const { data: publicUrlData } = supabase.storage
          .from("produce-images")
          .getPublicUrl(filePath)

        imageUrl = publicUrlData.publicUrl
      }

      const now = new Date()
      const durationHours = Number(formData.auctionDuration || "24")
      const endTime = new Date(now.getTime() + durationHours * 60 * 60 * 1000)

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
        start_time: now.toISOString(),
        end_time: endTime.toISOString(),
        status: "active",
        image_url: imageUrl,
        bid_count: 0,
      })

      if (insertError) {
        throw insertError
      }

      toast.success("Auction created successfully!")
      router.push("/farmer/dashboard")
    } catch (error: any) {
      console.error("Failed to create auction", error)
      toast.error(error?.message || "Failed to create auction")
      setIsSubmitting(false)
    }
  }

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
              <div className="space-y-2">
                <Label>Produce Image</Label>
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
                  <label className="flex h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50">
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <span className="mt-2 text-sm text-muted-foreground">
                      Click to upload image
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                )}
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

              {/* Price & Duration */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startingPrice">Starting Price (Rs.)</Label>
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
                <div className="space-y-2">
                  <Label>Auction Duration</Label>
                  <Select
                    value={formData.auctionDuration}
                    onValueChange={(value) => setFormData({ ...formData, auctionDuration: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6 hours</SelectItem>
                      <SelectItem value="12">12 hours</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem>
                      <SelectItem value="48">48 hours</SelectItem>
                      <SelectItem value="72">72 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

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
