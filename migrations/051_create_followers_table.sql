-- Followers table
create table if not exists followers (
  id uuid primary key default uuid_generate_v4(),
  follower_id uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, following_id)
);

create index if not exists idx_followers_follower on followers(follower_id);
create index if not exists idx_followers_following on followers(following_id);



