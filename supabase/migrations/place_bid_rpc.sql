-- ================================================================
-- Atomic Bid Placement RPC
-- ================================================================
-- This function atomically:
--   1. Validates that the listing is still active
--   2. Validates that the new bid is strictly greater than the
--      current highest bid **as recorded in the database** (not
--      the frontend's stale copy)
--   3. Inserts the bid into the `bids` table
--   4. Updates `current_highest_bid` and increments `bid_count`
--      on the `listings` table
--
-- All of this happens in a single transaction. If two vendors
-- bid at the exact same millisecond, PostgreSQL's row-level
-- locking (SELECT ... FOR UPDATE) ensures only one wins; the
-- other gets a clear error message.
--
-- Usage from the frontend:
--   const { data, error } = await supabase.rpc('place_bid', {
--     p_listing_id: '...',
--     p_vendor_id:  '...',
--     p_vendor_name: '...',
--     p_amount: 1500
--   })
-- ================================================================

CREATE OR REPLACE FUNCTION public.place_bid(
  p_listing_id  UUID,
  p_vendor_id   UUID,
  p_vendor_name TEXT,
  p_amount      NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_listing       RECORD;
  v_new_bid_id    UUID;
BEGIN
  -- 1. Lock the listing row to prevent concurrent modifications
  SELECT id, status, current_highest_bid, end_time, farmer_id, bid_count
    INTO v_listing
    FROM public.listings
   WHERE id = p_listing_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Listing not found');
  END IF;

  -- 2. Check the auction is still active
  IF v_listing.status <> 'active' THEN
    RETURN json_build_object('success', false, 'error', 'This auction has ended');
  END IF;

  IF v_listing.end_time <= NOW() THEN
    RETURN json_build_object('success', false, 'error', 'This auction has expired');
  END IF;

  -- 3. Prevent the farmer from bidding on their own listing
  IF v_listing.farmer_id = p_vendor_id THEN
    RETURN json_build_object('success', false, 'error', 'You cannot bid on your own listing');
  END IF;

  -- 4. Validate bid amount is strictly greater than current highest
  IF p_amount <= v_listing.current_highest_bid THEN
    RETURN json_build_object(
      'success', false,
      'error',   'Bid must be higher than the current highest bid of ' || v_listing.current_highest_bid
    );
  END IF;

  -- 5. Insert the bid
  INSERT INTO public.bids (listing_id, vendor_id, vendor_name, amount)
  VALUES (p_listing_id, p_vendor_id, p_vendor_name, p_amount)
  RETURNING id INTO v_new_bid_id;

  -- 6. Atomically update the listing
  UPDATE public.listings
     SET current_highest_bid = p_amount,
         bid_count           = v_listing.bid_count + 1
   WHERE id = p_listing_id;

  RETURN json_build_object(
    'success', true,
    'bid_id',  v_new_bid_id
  );
END;
$$;
