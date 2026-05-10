-- ============================================================
-- AgriAuct – Full Database Initialization
-- Run this SQL in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================
--
-- ⚠️  FREE-TIER LIMITATIONS & WORKAROUNDS
-- ────────────────────────────────────────
-- 1. EMAIL RATE LIMIT — Supabase's free-tier shared mailer caps
--    outgoing auth emails at ~3-4 per hour. To remove the limit
--    for free, configure a custom SMTP provider (e.g. Resend at
--    smtp.resend.com:465, or Brevo) in the Supabase Dashboard
--    under Authentication → SMTP Settings. During development
--    you can disable email confirmation entirely under
--    Authentication → Settings → Enable Email Confirmations.
--
-- 2. pg_cron NOT AVAILABLE — The close_expired_auctions()
--    function is never called automatically. On the free tier,
--    invoke it from the frontend via:
--      supabase.rpc('close_expired_auctions')
--    on a 60-second setInterval. Do NOT use pg_cron as it
--    requires Supabase Pro.
--
-- 3. REALTIME — The publication statements at the end of this
--    script may fail if Realtime is not yet enabled for the
--    target tables. Enable Realtime for public.bids and
--    public.listings in the Supabase Dashboard under
--    Database → Replication before running, or let the
--    wrapped DO block silently skip the error.
--
-- 4. STORAGE BUCKET — The produce-images bucket and its
--    policies are created at the bottom of this script. If the
--    bucket already exists the INSERT is a no-op. Verify the
--    three storage policies were applied after running.
-- ============================================================

-- ----------------------------------------------------------------
-- 0. Enable required extensions
-- ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------
-- 1. ENUM TYPES
-- ----------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role       AS ENUM ('farmer', 'vendor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crop_category   AS ENUM ('vegetables', 'fruits', 'grains', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE quality_grade   AS ENUM ('A', 'B', 'C');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE listing_status  AS ENUM ('active', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('outbid', 'won', 'auction_ended', 'new_bid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------
-- 2. TABLE: profiles
--    One row per authenticated user (mirrors auth.users)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  email       TEXT,
  phone       TEXT,
  state       TEXT,
  district    TEXT,
  role        user_role     NOT NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 3. TABLE: listings
--    One row per auction created by a farmer
-- ----------------------------------------------------------------
-- NOTE: end_time has no column DEFAULT because PostgreSQL cannot
-- reference another column (auction_duration) in a DEFAULT
-- expression. The application MUST compute and set end_time at
-- insert time as:  NOW() + INTERVAL '1 hour' * auction_duration
CREATE TABLE IF NOT EXISTS public.listings (
  id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id           UUID            NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  farmer_name         TEXT,
  crop_name           TEXT            NOT NULL,
  category            crop_category   NOT NULL,
  quantity            NUMERIC(10, 2)  NOT NULL CHECK (quantity > 0),
  quality_grade       quality_grade   NOT NULL,
  state               TEXT            NOT NULL,
  district            TEXT            NOT NULL,
  starting_price      NUMERIC(12, 2)  NOT NULL CHECK (starting_price > 0),
  current_highest_bid NUMERIC(12, 2)  NOT NULL DEFAULT 0,
  auction_duration    INT             NOT NULL DEFAULT 24 CHECK (auction_duration > 0),  -- hours
  start_time          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  end_time            TIMESTAMPTZ     NOT NULL,
  status              listing_status  NOT NULL DEFAULT 'active',
  image_url           TEXT,
  bid_count           INT             NOT NULL DEFAULT 0,
  winner_id           UUID            REFERENCES public.profiles(id) ON DELETE SET NULL,
  winner_name         TEXT,
  description         TEXT,
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_farmer_id ON public.listings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_listings_status    ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_end_time  ON public.listings(end_time);
CREATE INDEX IF NOT EXISTS idx_listings_category  ON public.listings(category);

-- ----------------------------------------------------------------
-- 4. TABLE: bids
--    One row per bid placed by a vendor
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bids (
  id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id  UUID            NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  vendor_id   UUID            NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vendor_name TEXT,
  amount      NUMERIC(12, 2)  NOT NULL CHECK (amount > 0),
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bids_listing_id ON public.bids(listing_id);
CREATE INDEX IF NOT EXISTS idx_bids_vendor_id  ON public.bids(vendor_id);
CREATE INDEX IF NOT EXISTS idx_bids_amount     ON public.bids(amount DESC);

-- ----------------------------------------------------------------
-- 5. TABLE: notifications
--    One row per notification sent to a user
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID                NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message     TEXT                NOT NULL,
  is_read     BOOLEAN             NOT NULL DEFAULT FALSE,
  type        notification_type   NOT NULL,
  listing_id  UUID                REFERENCES public.listings(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id    ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read    ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_listing_id ON public.notifications(listing_id);

-- ----------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------

-- 6a. profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read any profile (needed to show farmer/vendor names)
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  USING (true);

-- Only the owner can insert their own profile
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Only the owner can update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 6b. listings
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Anyone (even anonymous) can read listings
CREATE POLICY "listings_select_all"
  ON public.listings FOR SELECT
  USING (true);

-- Only authenticated farmers can insert
CREATE POLICY "listings_insert_farmer"
  ON public.listings FOR INSERT
  WITH CHECK (auth.uid() = farmer_id);

-- Only the owning farmer can update their own listing (all fields)
DROP POLICY IF EXISTS "listings_update_farmer_own" ON public.listings;
CREATE POLICY "listings_update_farmer"
  ON public.listings FOR UPDATE
  USING (auth.uid() = farmer_id);

-- Vendors can update bid-related fields only (current_highest_bid, bid_count)
-- NOTE: RLS controls row access, not column access. For full column-level
-- protection, use a Supabase Edge Function or database function for bid updates.
CREATE POLICY "listings_update_vendor_bid"
  ON public.listings FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'vendor'));

-- Only the owning farmer can delete
CREATE POLICY "listings_delete_farmer"
  ON public.listings FOR DELETE
  USING (auth.uid() = farmer_id);

-- 6c. bids
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- Anyone can read bids
CREATE POLICY "bids_select_all"
  ON public.bids FOR SELECT
  USING (true);

-- Only authenticated vendors can insert bids, and they cannot bid
-- on their own listings (prevents farmer self-bidding)
CREATE POLICY "bids_insert_vendor"
  ON public.bids FOR INSERT
  WITH CHECK (
    auth.uid() = vendor_id
    AND auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'vendor')
    AND auth.uid() NOT IN (SELECT farmer_id FROM public.listings WHERE id = listing_id)
  );

-- 6d. notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Allow any insert into notifications.
-- The close_expired_auctions() function runs as SECURITY DEFINER
-- (service role) and has no auth.uid(), so the previous
-- WITH CHECK (auth.uid() = user_id) blocked it. Using (true)
-- allows the function to insert notifications for any user.
DROP POLICY IF EXISTS "notifications_insert_service" ON public.notifications;
CREATE POLICY "notifications_insert_service"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Users can mark their own notifications as read
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- 7. TRIGGER: auto-create profile after signup
--    When a user signs up via Supabase Auth, their row in
--    auth.users triggers a corresponding insert into profiles.
--    (Covers the edge case of direct auth sign-up without
--     the explicit profile insert in the frontend.)
--
-- ⚠️  EMAIL RATE LIMIT WARNING
-- Supabase's free tier limits outgoing auth emails to
-- approximately 3–4 per hour on the shared mailer. To remove
-- this limit completely for free, configure a custom SMTP
-- provider such as Resend (smtp.resend.com, port 465) or Brevo
-- in the Supabase Dashboard under Authentication → SMTP Settings.
-- During development, disable email confirmation entirely under
-- Authentication → Settings → Enable Email Confirmations.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, state, district, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'state',
    NEW.raw_user_meta_data->>'district',
    (NEW.raw_user_meta_data->>'role')::user_role,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone     = EXCLUDED.phone,
    state     = EXCLUDED.state,
    district  = EXCLUDED.district,
    role      = COALESCE(EXCLUDED.role, profiles.role);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ----------------------------------------------------------------
-- 8. FUNCTION: close expired auctions
--    Updates listings whose end_time has passed to 'closed'
--    and sets winner_id / winner_name from the highest bid.
--
-- ⚠️  This function must be called externally. On the free tier,
--    call it via supabase.rpc('close_expired_auctions') from
--    the frontend on a 60-second interval using setInterval.
--    Do NOT use pg_cron as it requires Supabase Pro.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.close_expired_auctions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
  top_bid RECORD;
BEGIN
  FOR rec IN
    SELECT id FROM public.listings
    WHERE status = 'active' AND end_time <= NOW()
  LOOP
    -- Find highest bid for this listing
    SELECT vendor_id, vendor_name, amount
      INTO top_bid
      FROM public.bids
     WHERE listing_id = rec.id
     ORDER BY amount DESC
     LIMIT 1;

    IF FOUND THEN
      UPDATE public.listings
         SET status = 'closed',
             winner_id = top_bid.vendor_id,
             winner_name = top_bid.vendor_name,
             current_highest_bid = top_bid.amount
       WHERE id = rec.id;

      -- Notify winner
      INSERT INTO public.notifications (user_id, message, type, listing_id)
        SELECT top_bid.vendor_id,
               'Congratulations! You won the auction for ' || l.crop_name,
               'won',
               rec.id
          FROM public.listings l WHERE l.id = rec.id;

      -- Notify farmer
      INSERT INTO public.notifications (user_id, message, type, listing_id)
        SELECT l.farmer_id,
               'Your auction for ' || l.crop_name || ' has ended. Winner: ' || top_bid.vendor_name,
               'auction_ended',
               rec.id
          FROM public.listings l WHERE l.id = rec.id;
    ELSE
      -- No bids – close with no winner
      UPDATE public.listings
         SET status = 'closed'
       WHERE id = rec.id;

      INSERT INTO public.notifications (user_id, message, type, listing_id)
        SELECT l.farmer_id,
               'Your auction for ' || l.crop_name || ' ended with no bids.',
               'auction_ended',
               rec.id
          FROM public.listings l WHERE l.id = rec.id;
    END IF;
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------
-- 9. REALTIME: Enable for live bid feed
--    Supabase Realtime must also be ON in the dashboard for
--    the bids and listings tables. Wrapped in a DO block so
--    the script does not fail on fresh runs where Realtime
--    is not yet configured.
-- ----------------------------------------------------------------
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ----------------------------------------------------------------
-- 10. STORAGE: produce-images bucket
--     Run this block to create the storage bucket used for
--     crop images uploaded during auction creation.
-- ----------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('produce-images', 'produce-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow any authenticated user to upload to their own folder
CREATE POLICY "produce_images_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'produce-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow anyone to read/download images
CREATE POLICY "produce_images_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'produce-images');

-- Allow owners to delete their own images
CREATE POLICY "produce_images_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'produce-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ----------------------------------------------------------------
-- Done! Your AgriAuct database is fully set up.
-- ----------------------------------------------------------------
