-- ==============================================================================
-- Migration: Row Level Security (RLS) Policies and Database Hardening
-- Run this in your Supabase SQL Editor to enforce strict multi-tenant isolation
-- ==============================================================================

-- 1. Profiles
alter table if exists public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
    on public.profiles for select
    using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
    on public.profiles for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- 2. Todos
alter table if exists public.todos enable row level security;

drop policy if exists "Users can view own todos" on public.todos;
create policy "Users can view own todos"
    on public.todos for select
    using (auth.uid() = user_id);

drop policy if exists "Users can insert own todos" on public.todos;
create policy "Users can insert own todos"
    on public.todos for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update own todos" on public.todos;
create policy "Users can update own todos"
    on public.todos for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can delete own todos" on public.todos;
create policy "Users can delete own todos"
    on public.todos for delete
    using (auth.uid() = user_id);

-- 3. Expense Categories
alter table if exists public.expense_categories enable row level security;

drop policy if exists "Users can view own expense categories" on public.expense_categories;
create policy "Users can view own expense categories"
    on public.expense_categories for select
    using (auth.uid() = user_id);

drop policy if exists "Users can insert own expense categories" on public.expense_categories;
create policy "Users can insert own expense categories"
    on public.expense_categories for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update own expense categories" on public.expense_categories;
create policy "Users can update own expense categories"
    on public.expense_categories for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can delete own expense categories" on public.expense_categories;
create policy "Users can delete own expense categories"
    on public.expense_categories for delete
    using (auth.uid() = user_id);

-- 4. Expenses
alter table if exists public.expenses enable row level security;

drop policy if exists "Users can view own expenses" on public.expenses;
create policy "Users can view own expenses"
    on public.expenses for select
    using (auth.uid() = user_id);

drop policy if exists "Users can insert own expenses" on public.expenses;
create policy "Users can insert own expenses"
    on public.expenses for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update own expenses" on public.expenses;
create policy "Users can update own expenses"
    on public.expenses for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can delete own expenses" on public.expenses;
create policy "Users can delete own expenses"
    on public.expenses for delete
    using (auth.uid() = user_id);

-- 5. Calendar Events
alter table if exists public.calendar_events enable row level security;

drop policy if exists "Users can view own calendar events" on public.calendar_events;
create policy "Users can view own calendar events"
    on public.calendar_events for select
    using (auth.uid() = user_id);

drop policy if exists "Users can insert own calendar events" on public.calendar_events;
create policy "Users can insert own calendar events"
    on public.calendar_events for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update own calendar events" on public.calendar_events;
create policy "Users can update own calendar events"
    on public.calendar_events for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can delete own calendar events" on public.calendar_events;
create policy "Users can delete own calendar events"
    on public.calendar_events for delete
    using (auth.uid() = user_id);

-- 6. Settings
alter table if exists public.settings enable row level security;

drop policy if exists "Users can view own settings" on public.settings;
create policy "Users can view own settings"
    on public.settings for select
    using (auth.uid() = user_id);

drop policy if exists "Users can insert own settings" on public.settings;
create policy "Users can insert own settings"
    on public.settings for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update own settings" on public.settings;
create policy "Users can update own settings"
    on public.settings for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- 7. Fuel Prices (Read-only for users, writes restricted to service_role)
alter table if exists public.fuel_prices enable row level security;

drop policy if exists "Anyone can read fuel prices" on public.fuel_prices;
create policy "Anyone can read fuel prices"
    on public.fuel_prices for select
    using (true);
