-- Shared purchase social tables
-- Run this in Supabase SQL editor

-- 1. Follow graph
create table if not exists public.user_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid references profiles(id) on delete cascade,
  followed_id uuid references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_follows_unique unique (follower_id, followed_id),
  constraint user_follows_self prevent_self_follow check (follower_id <> followed_id)
);
create index if not exists idx_user_follows_follower on public.user_follows (follower_id);
create index if not exists idx_user_follows_followed on public.user_follows (followed_id);

-- 2. Shared boxes (group orders per producer)
create table if not exists public.shared_boxes (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid references producers(id),
  producer_name text,
  created_by uuid references profiles(id) on delete set null,
  title text,
  status text not null default 'open', -- open | locked | submitted | fulfilled
  target_quantity int not null default 6,
  total_quantity int not null default 0,
  remaining_quantity int not null default 6,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_shared_boxes_creator on public.shared_boxes (created_by);
create index if not exists idx_shared_boxes_status on public.shared_boxes (status);

-- 3. Participants
create table if not exists public.shared_box_participants (
  id uuid primary key default gen_random_uuid(),
  shared_box_id uuid references shared_boxes(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text not null default 'member', -- owner | member
  invite_status text not null default 'accepted', -- accepted | pending
  contribution_bottles int not null default 0,
  created_at timestamptz not null default now(),
  constraint shared_box_participants_unique unique (shared_box_id, user_id)
);
create index if not exists idx_shared_box_participants_box on public.shared_box_participants (shared_box_id);
create index if not exists idx_shared_box_participants_user on public.shared_box_participants (user_id);

-- 4. Items added to shared boxes
create table if not exists public.shared_box_items (
  id uuid primary key default gen_random_uuid(),
  shared_box_id uuid references shared_boxes(id) on delete cascade,
  wine_id uuid references wines(id),
  added_by uuid references profiles(id) on delete set null,
  quantity int not null default 1,
  cart_item_id uuid references cart_items(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_shared_box_items_box on public.shared_box_items (shared_box_id);
create index if not exists idx_shared_box_items_wine on public.shared_box_items (wine_id);

-- 5. Link shared boxes directly to cart rows
alter table cart_items
  add column if not exists shared_box_id uuid references shared_boxes(id);


