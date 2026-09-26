-- ==============================================================================
-- Migration: Add LINE Reminders to Todos Table
-- Date: 2026-09-27
-- Instructions: Run this in your Supabase SQL Editor
-- ==============================================================================

-- 1. Add reminder columns to todos table
alter table public.todos
    add column if not exists reminder_at timestamp with time zone default null,
    add column if not exists is_reminded boolean not null default false,
    add column if not exists reminded_at timestamp with time zone default null;

-- 2. Create index for high-performance scheduler lookup
-- Fast filtering of overdue/pending reminders that have not been sent yet
create index if not exists todos_reminder_lookup_idx
    on public.todos (reminder_at, is_reminded, completed)
    where reminder_at is not null and is_reminded = false and completed = false;

-- 3. (Optional) Setup pg_cron & pg_net to call your Next.js reminder API automatically
-- Note: Replace 'https://YOUR_DOMAIN.vercel.app' and 'YOUR_CRON_SECRET' with your actual values.
--
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;
--
-- select cron.schedule(
--     'send-todo-line-reminders',
--     '* * * * *', -- runs every minute
--     $$
--         select net.http_post(
--             url := 'https://YOUR_DOMAIN.vercel.app/api/cron/send-reminders',
--             headers := jsonb_build_object(
--                 'Content-Type', 'application/json',
--                 'Authorization', 'Bearer YOUR_CRON_SECRET'
--             ),
--             body := '{}'::jsonb
--         );
--     $$
-- );
