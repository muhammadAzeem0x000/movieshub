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
