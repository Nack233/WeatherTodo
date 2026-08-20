-- Migration for LINE Bot integration
-- Run this in your Supabase SQL Editor if not automatically applied

create table if not exists public.line_accounts (
    line_user_id text primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    display_name text,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

-- Index for lookup
create index if not exists line_accounts_user_id_idx on public.line_accounts (user_id);

-- Enable RLS
alter table public.line_accounts enable row level security;

-- Allow users to view/manage their own line bindings
create policy "Users can view their own line account"
    on public.line_accounts for select
    using (auth.uid() = user_id);

create policy "Users can update their own line account"
    on public.line_accounts for update
    using (auth.uid() = user_id);

create policy "Users can delete their own line account"
    on public.line_accounts for delete
    using (auth.uid() = user_id);
