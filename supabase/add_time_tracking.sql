-- Run this in your Supabase SQL Editor to add time tracking support

-- Add time_minutes column to tasks (nullable — only set when user logs time)
alter table tasks add column if not exists time_minutes int;

-- User settings table for per-user feature toggles
create table if not exists user_settings (
  user_id uuid references auth.users(id) on delete cascade primary key,
  time_tracking_enabled boolean default false,
  updated_at timestamptz default now()
);

alter table user_settings enable row level security;

create policy "Users manage own settings"
  on user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
