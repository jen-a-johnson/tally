-- Run this in your Supabase SQL Editor to add recurring tasks support

create table recurring_tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  frequency text not null check (frequency in ('daily', 'weekly')),
  days_of_week int[] default '{}',  -- 0=Sun, 1=Mon, ... 6=Sat (for weekly)
  priority int default 2 check (priority between 1 and 3),
  created_at timestamptz default now()
);

alter table recurring_tasks enable row level security;

create policy "Users manage own recurring tasks"
  on recurring_tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
