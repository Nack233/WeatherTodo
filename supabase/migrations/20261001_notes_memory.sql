-- ==============================================================================
-- Migration: 20261001_notes_memory.sql
-- Description: Create user_notes table for Smart Notes & AI Second Brain
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.user_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    tags TEXT[] DEFAULT '{}',
    key_facts JSONB DEFAULT '{}'::jsonb,
    is_pinned BOOLEAN DEFAULT FALSE,
    color VARCHAR(30) DEFAULT 'tag-blue',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON public.user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_category ON public.user_notes(category);
CREATE INDEX IF NOT EXISTS idx_user_notes_pinned ON public.user_notes(is_pinned);
CREATE INDEX IF NOT EXISTS idx_user_notes_created_at ON public.user_notes(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own notes" ON public.user_notes;
CREATE POLICY "Users can view their own notes"
    ON public.user_notes FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own notes" ON public.user_notes;
CREATE POLICY "Users can insert their own notes"
    ON public.user_notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notes" ON public.user_notes;
CREATE POLICY "Users can update their own notes"
    ON public.user_notes FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notes" ON public.user_notes;
CREATE POLICY "Users can delete their own notes"
    ON public.user_notes FOR DELETE
    USING (auth.uid() = user_id);
