-- Initial schema for AgriAuct Supabase setup

-- PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text unique,
  phone text,
  state text,
  district text,
  role text,
  created_at timestamptz default now()
);

-- LISTINGS
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles (id) on delete cascade,
  crop_name text not null,
  category text,
  quantity numeric,
  quality_grade text,
  state text,
  district text,
  starting_price numeric,
  current_highest_bid numeric,
  auction_duration integer,
  start_time timestamptz,
  end_time timestamptz,
  status text default 'active',
  image_url text,
  bid_count integer default 0,
  winner_id uuid references public.profiles (id),
  winner_name text,
  created_at timestamptz default now()
);

-- BIDS
create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  vendor_id uuid not null references public.profiles (id) on delete cascade,
  vendor_name text,
  amount numeric not null,
  created_at timestamptz default now()
);

-- NOTIFICATIONS
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  message text not null,
  is_read boolean default false,
  type text,
  listing_id uuid references public.listings (id) on delete cascade,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.bids enable row level security;
alter table public.notifications enable row level security;



-- Profiles: users can read all profiles, only update their own
create policy "profiles_read_all"
on public.profiles
for select
using (true);

create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id);

-- Listings: anyone can read active listings, only farmer can create/update their own
create policy "listings_read_active"
on public.listings
for select
using (status = 'active');

create policy "listings_insert_own"
on public.listings
for insert
with check (auth.uid() = farmer_id);

create policy "listings_update_own"
on public.listings
for update
using (auth.uid() = farmer_id);

-- Bids: anyone can read bids, only authenticated vendors can insert
create policy "bids_read_all"
on public.bids
for select
using (true);

create policy "bids_insert_vendors"
on public.bids
for insert
with check (
  auth.role() = 'authenticated'
  and exists (
    select 1
    from public.profiles p
    where p.id = vendor_id
      and p.role = 'vendor'
  )
);

-- Notifications: users can only read and update their own notifications
create policy "notifications_read_own"
on public.notifications
for select
using (auth.uid() = user_id);

create policy "notifications_update_own"
on public.notifications
for update
using (auth.uid() = user_id);

-- You may want a service-role-only insert policy for notifications; by default
-- no insert/delete is allowed without explicit policies.

-- Enable Supabase Realtime on bids and listings
alter publication supabase_realtime add table public.bids;
alter publication supabase_realtime add table public.listings;

-- Storage bucket for produce images
insert into storage.buckets (id, name, public)
values ('produce-images', 'produce-images', true)
on conflict (id) do nothing;

-- Functions and triggers to close ended auctions and set winners

create or replace function public.close_ended_auctions()
returns void
language plpgsql
as $$
begin
  update public.listings l
  set status = 'closed',
      winner_id = b.vendor_id,
      winner_name = b.vendor_name
  from (
    select listing_id,
           vendor_id,
           vendor_name,
           amount,
           row_number() over (partition by listing_id order by amount desc, created_at asc) as rn
    from public.bids
  ) b
  where b.rn = 1
    and l.id = b.listing_id
    and l.status = 'active'
    and l.end_time <= now();
end;
$$;

create or replace function public.handle_bid_insert()
returns trigger
language plpgsql
as $$
begin
  perform public.close_ended_auctions();
  return new;
end;
$$;

drop trigger if exists trg_handle_bid_insert on public.bids;

create trigger trg_handle_bid_insert
after insert on public.bids
for each row
execute procedure public.handle_bid_insert();


