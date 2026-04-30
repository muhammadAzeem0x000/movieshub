-- Create user_movies table
CREATE TABLE public.user_movies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tmdb_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    poster_path TEXT,
    genres TEXT[] DEFAULT '{}',
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 10),
    review TEXT,
    watched_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_movies ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own movies"
    ON public.user_movies FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own movies"
    ON public.user_movies FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own movies"
    ON public.user_movies FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own movies"
    ON public.user_movies FOR DELETE
    USING (auth.uid() = user_id);

-- Create index for faster queries on user_id
CREATE INDEX idx_user_movies_user_id ON public.user_movies(user_id);


-- ==============================================
-- MIGRATION: Multi-Search (Movies & TV Shows)
-- Run this if you already created the user_movies table above
-- ==============================================

-- 1. Rename the table
ALTER TABLE public.user_movies RENAME TO user_media;

-- 2. Add the new media_type column
-- We temporarily add a default value to satisfy NOT NULL for existing rows
ALTER TABLE public.user_media ADD COLUMN media_type TEXT NOT NULL DEFAULT 'movie';

-- 3. Remove the default value so future inserts must explicitly provide it
ALTER TABLE public.user_media ALTER COLUMN media_type DROP DEFAULT;

-- 4. Update index name (optional, for clarity)
ALTER INDEX idx_user_movies_user_id RENAME TO idx_user_media_user_id;

-- 5. Update policy names (optional, for clarity)
ALTER POLICY "Users can view their own movies" ON public.user_media RENAME TO "Users can view their own media";
ALTER POLICY "Users can insert their own movies" ON public.user_media RENAME TO "Users can insert their own media";
ALTER POLICY "Users can update their own movies" ON public.user_media RENAME TO "Users can update their own media";
ALTER POLICY "Users can delete their own movies" ON public.user_media RENAME TO "Users can delete their own media";
