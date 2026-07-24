-- Supabase relationships for chanthaburi-nextjs-dashboard
-- Run this in the Supabase SQL editor or as a migration.

create extension if not exists pgcrypto;

-- Keep profiles aligned with auth.users.
alter table public.profiles
    alter column id drop default;

alter table public.profiles
    drop constraint if exists profiles_id_fkey;

alter table public.profiles
    add constraint profiles_id_fkey
    foreign key (id)
    references auth.users (id)
    on delete cascade;

alter table public.profiles
    add column if not exists updated_at timestamp with time zone not null default now();

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, display_name)
    values (
        new.id,
        coalesce(
            nullif(new.raw_user_meta_data->>'display_name', ''),
            nullif(new.email, ''),
            'User'
        )
    );
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- User-owned tables should point to profiles.
alter table public.todos
    drop constraint if exists todos_user_id_fkey;

alter table public.todos
    add constraint todos_user_id_fkey
    foreign key (user_id)
    references public.profiles (id)
    on delete cascade;

alter table public.todos
    add column if not exists updated_at timestamp with time zone not null default now();

alter table public.expense_categories
    drop constraint if exists expense_categories_user_id_fkey;

alter table public.expense_categories
    add constraint expense_categories_user_id_fkey
    foreign key (user_id)
    references public.profiles (id)
    on delete cascade;

alter table public.expenses
    drop constraint if exists expenses_user_id_fkey;

alter table public.expenses
    add constraint expenses_user_id_fkey
    foreign key (user_id)
    references public.profiles (id)
    on delete cascade;

alter table public.expenses
    drop constraint if exists expenses_category_id_fkey;

alter table public.expenses
    add constraint expenses_category_id_fkey
    foreign key (category_id)
    references public.expense_categories (id)
    on delete set null;

alter table public.expense_categories
    add column if not exists updated_at timestamp with time zone not null default now();

alter table public.expenses
    add column if not exists updated_at timestamp with time zone not null default now();

alter table public.calendar_events
    drop constraint if exists calendar_events_user_id_fkey;

alter table public.calendar_events
    add constraint calendar_events_user_id_fkey
    foreign key (user_id)
    references public.profiles (id)
    on delete cascade;

alter table public.calendar_events
    add column if not exists updated_at timestamp with time zone not null default now();

alter table public.settings
    drop constraint if exists settings_user_id_fkey;

alter table public.settings
    add constraint settings_user_id_fkey
    foreign key (user_id)
    references public.profiles (id)
    on delete cascade;

-- Helpful indexes for the common lookup paths.
create index if not exists todos_user_id_idx on public.todos (user_id);
create index if not exists expense_categories_user_id_idx on public.expense_categories (user_id);
create index if not exists expenses_user_id_idx on public.expenses (user_id);
create index if not exists expenses_category_id_idx on public.expenses (category_id);
create index if not exists calendar_events_user_id_idx on public.calendar_events (user_id);
create index if not exists settings_user_id_idx on public.settings (user_id);
