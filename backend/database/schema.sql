CREATE TABLE IF NOT EXISTS public.regions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL,
    color TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    tags JSONB DEFAULT '[]'::jsonb,
    cards JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.provinces (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    region_id TEXT NOT NULL REFERENCES public.regions(id) ON DELETE RESTRICT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    tagline TEXT,
    capital TEXT NOT NULL,
    population TEXT,
    area TEXT,
    language TEXT,
    hero_image TEXT,
    description TEXT,
    facts JSONB DEFAULT '[]'::jsonb,
    difficulty TEXT DEFAULT 'sedang',
    unlock_cost INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cultures (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    province_id BIGINT NOT NULL REFERENCES public.provinces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tourisms (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    province_id BIGINT NOT NULL REFERENCES public.provinces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT NOT NULL,
    image TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.culinaries (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    province_id BIGINT NOT NULL REFERENCES public.provinces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    image TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quizzes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    province_slug TEXT DEFAULT 'general',
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    answer_index INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.puzzles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title TEXT NOT NULL,
    emoji_grid JSONB NOT NULL,
    correct_grid JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_progress (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id TEXT UNIQUE NOT NULL,
    keys INT DEFAULT 1,
    total_score INT DEFAULT 0,
    games_played INT DEFAULT 0,
    unlocked_provinces JSONB DEFAULT '[]'::jsonb,
    completed_games JSONB DEFAULT '{}'::jsonb,
    claimed_rewards JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cultures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tourisms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.culinaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read regions" ON public.regions FOR SELECT USING (true);
CREATE POLICY "Public read provinces" ON public.provinces FOR SELECT USING (true);
CREATE POLICY "Public read cultures" ON public.cultures FOR SELECT USING (true);
CREATE POLICY "Public read tourisms" ON public.tourisms FOR SELECT USING (true);
CREATE POLICY "Public read culinaries" ON public.culinaries FOR SELECT USING (true);
CREATE POLICY "Public read quizzes" ON public.quizzes FOR SELECT USING (true);
CREATE POLICY "Public read puzzles" ON public.puzzles FOR SELECT USING (true);

CREATE POLICY "Public read user_progress" ON public.user_progress FOR SELECT USING (true);
CREATE POLICY "Public insert user_progress" ON public.user_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update user_progress" ON public.user_progress FOR UPDATE USING (true);
