import Link from "next/link"
import {
  ArrowRight,
  Leaf,
  TrendingUp,
  Users,
  Shield,
  Clock,
  Award,
  Instagram,
  Linkedin,
  Twitter,
  Facebook,
  Youtube,
  MessageCircle,
  Phone,
  Apple,
  PlayCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">AgriAuct</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              How It Works
            </Link>
            <Link href="/auth/login" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Login
            </Link>
            <Button size="lg" asChild className="px-6">
              <Link href="/auth/register">Get Started</Link>
            </Button>
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth/login">Login</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/auth/register">Register</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative flex min-h-[calc(100vh-4rem)] items-center overflow-hidden px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Connecting Farmers Directly to Vendors Through Live Auctions
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground sm:mt-10 sm:text-xl">
            AgriAuct empowers Indian farmers to get fair prices for their produce through transparent, 
            real-time online auctions. No middlemen, better profits.
          </p>
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:mt-14 sm:flex-row">
            <Button size="lg" asChild className="w-full sm:w-auto">
              <Link href="/auth/register?role=farmer">
                Register as Farmer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/auth/register?role=vendor">
                Register as Vendor
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-border bg-primary/5 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 md:grid-cols-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary sm:text-4xl">10,000+</div>
            <div className="mt-1 text-sm text-muted-foreground">Active Farmers</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary sm:text-4xl">5,000+</div>
            <div className="mt-1 text-sm text-muted-foreground">Verified Vendors</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary sm:text-4xl">50,000+</div>
            <div className="mt-1 text-sm text-muted-foreground">Auctions Completed</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary sm:text-4xl">28</div>
            <div className="mt-1 text-sm text-muted-foreground">States Covered</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Why Choose AgriAuct?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Our platform provides everything farmers and vendors need for successful agricultural trading.
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={TrendingUp}
              title="Better Prices"
              description="Competitive bidding ensures farmers get the best market rates for their produce, eliminating middlemen margins."
            />
            <FeatureCard
              icon={Clock}
              title="Real-Time Bidding"
              description="Live auction updates with instant notifications keep you informed about every bid as it happens."
            />
            <FeatureCard
              icon={Shield}
              title="Secure Transactions"
              description="Verified users and secure payment processes protect both farmers and vendors in every transaction."
            />
            <FeatureCard
              icon={Users}
              title="Direct Connection"
              description="Connect directly with verified vendors across India without any intermediaries or brokers."
            />
            <FeatureCard
              icon={Leaf}
              title="Quality Grades"
              description="Standardized quality grading system helps vendors make informed decisions about produce quality."
            />
            <FeatureCard
              icon={Award}
              title="Transparent Process"
              description="Complete visibility into bid history and auction progress ensures fair and transparent trading."
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-muted/30 px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              How It Works
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Getting started with AgriAuct is simple. Follow these steps to begin trading.
            </p>
          </div>
          <div className="mt-16 grid gap-8 lg:grid-cols-2">
            {/* For Farmers */}
            <div className="rounded-2xl border border-border bg-card p-8">
              <div className="mb-6 inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                For Farmers
              </div>
              <div className="space-y-6">
                <Step number={1} title="Register Your Account" description="Sign up with your details and verify your identity as a farmer." />
                <Step number={2} title="List Your Produce" description="Add details about your crop, quantity, quality grade, and set a starting price." />
                <Step number={3} title="Start Auction" description="Set auction duration and let vendors compete for your produce." />
                <Step number={4} title="Get Paid" description="Receive payment from the winning bidder directly to your account." />
              </div>
            </div>
            {/* For Vendors */}
            <div className="rounded-2xl border border-border bg-card p-8">
              <div className="mb-6 inline-flex items-center rounded-full bg-accent/80 px-4 py-2 text-sm font-medium text-accent-foreground">
                For Vendors
              </div>
              <div className="space-y-6">
                <Step number={1} title="Create Vendor Account" description="Register and complete your business profile verification." />
                <Step number={2} title="Browse Auctions" description="Explore live auctions filtered by category, location, and quality." />
                <Step number={3} title="Place Bids" description="Compete in real-time auctions and track your bid status instantly." />
                <Step number={4} title="Win & Receive" description="Win auctions and arrange delivery directly with the farmer." />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-3xl bg-primary p-8 text-center sm:p-12 lg:p-16">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
            Ready to Transform Your Agricultural Trading?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-primary-foreground/80">
            Join thousands of farmers and vendors already benefiting from transparent, fair agricultural auctions.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" variant="secondary" asChild className="w-full sm:w-auto">
              <Link href="/auth/register?role=farmer">
                Start as Farmer
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="w-full border-white bg-white text-primary hover:bg-white/90 sm:w-auto">
              <Link href="/auth/register?role=vendor">
                Start as Vendor
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0f172a] px-4 py-16 text-slate-200 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-start gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
            {/* Brand */}
            <div className="space-y-5">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/90">
                  <Leaf className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold text-white">AgriAuct</span>
              </Link>
              <p className="max-w-sm text-sm leading-relaxed text-slate-300">
                AgriAuct is a digital marketplace where farmers sell crops through transparent online auctions and buyers get fair prices.
              </p>
            </div>

            {/* Product */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Product</h3>
                <div className="mt-1 h-0.5 w-6 bg-[#22c55e]" />
              </div>
              <ul className="space-y-2 text-sm text-[#94a3b8]">
                <li>
                  <Link href="#features" className="transition-colors hover:text-white">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#how-it-works" className="transition-colors hover:text-white">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="/auth/register?role=farmer" className="transition-colors hover:text-white">
                    For Farmers
                  </Link>
                </li>
                <li>
                  <Link href="/auth/register?role=vendor" className="transition-colors hover:text-white">
                    For Buyers
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Company</h3>
                <div className="mt-1 h-0.5 w-6 bg-[#22c55e]" />
              </div>
              <ul className="space-y-2 text-sm text-[#94a3b8]">
                <li>
                  <Link href="#" className="transition-colors hover:text-white">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="#" className="transition-colors hover:text-white">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">Support</h3>
                  <div className="mt-1 h-0.5 w-6 bg-[#22c55e]" />
                </div>
                <ul className="space-y-2 text-sm text-[#94a3b8]">
                  <li>
                    <Link href="#" className="transition-colors hover:text-white">
                      Help Center
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="transition-colors hover:text-white">
                      Grievance Redressal
                    </Link>
                  </li>
                  <li>
                    <Link href="mailto:support@agriauct.com" className="transition-colors hover:text-white">
                      support@agriauct.com
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border-l-4 border-[#22c55e] bg-[#1e293b] p-3 text-sm text-slate-100">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-200">
                    <Phone className="h-3.5 w-3.5" />
                    <span>Kisan Helpline</span>
                  </div>
                  <p className="mt-2 text-base font-semibold text-white">+91 253 200 0000</p>
                  <p className="mt-1 text-xs text-slate-300">
                    Mon–Sat, 9AM–6PM | Free Call
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#22c55e] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#16a34a]"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp Us</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-white/10 py-6">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#94a3b8]">
                © 2026 AgriAuct. All rights reserved.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-[#94a3b8]">
                <Link href="#" className="transition-colors hover:text-white">
                  Privacy Policy
                </Link>
                <span className="text-[#64748b]">|</span>
                <Link href="#" className="transition-colors hover:text-white">
                  Terms of Service
                </Link>
                <span className="text-[#64748b]">|</span>
                <Link href="#" className="transition-colors hover:text-white">
                  Cookie Policy
                </Link>
                <span className="text-[#64748b]">|</span>
                <Link href="#" className="transition-colors hover:text-white">
                  Refund Policy
                </Link>
              </div>

              <div className="flex items-center justify-center gap-3">
                <Link
                  href="#"
                  aria-label="AgriAuct on Facebook"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1e293b] text-white transition-colors hover:bg-[#22c55e]"
                >
                  <Facebook className="h-4 w-4" />
                </Link>
                <Link
                  href="#"
                  aria-label="AgriAuct on Twitter"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1e293b] text-white transition-colors hover:bg-[#22c55e]"
                >
                  <Twitter className="h-4 w-4" />
                </Link>
                <Link
                  href="#"
                  aria-label="AgriAuct on LinkedIn"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1e293b] text-white transition-colors hover:bg-[#22c55e]"
                >
                  <Linkedin className="h-4 w-4" />
                </Link>
                <Link
                  href="#"
                  aria-label="AgriAuct on Instagram"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1e293b] text-white transition-colors hover:bg-[#22c55e]"
                >
                  <Instagram className="h-4 w-4" />
                </Link>
                <Link
                  href="#"
                  aria-label="AgriAuct on YouTube"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1e293b] text-white transition-colors hover:bg-[#22c55e]"
                >
                  <Youtube className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-colors transition-shadow hover:bg-primary/5 hover:shadow-md">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-card-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  )
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
        {number}
      </div>
      <div>
        <h4 className="font-semibold text-card-foreground">{title}</h4>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
