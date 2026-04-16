-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: user_profiles
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tree JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- TABLE: user_subscriptions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tier TEXT NOT NULL DEFAULT 'free',
    message_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- TABLE: pages
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    vibe TEXT,
    html TEXT NOT NULL,
    slug TEXT UNIQUE,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- user_profiles policies
DROP POLICY IF EXISTS "Users can view their own profile tree" ON public.user_profiles;
CREATE POLICY "Users can view their own profile tree"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile tree" ON public.user_profiles;
CREATE POLICY "Users can insert their own profile tree"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile tree" ON public.user_profiles;
CREATE POLICY "Users can update their own profile tree"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own profile tree" ON public.user_profiles;
CREATE POLICY "Users can delete their own profile tree"
    ON public.user_profiles FOR DELETE
    USING (auth.uid() = user_id);

-- user_subscriptions policies
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can view their own subscription"
    ON public.user_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- pages policies
DROP POLICY IF EXISTS "Pages are viewable by everyone" ON public.pages;
DROP POLICY IF EXISTS "Published pages are viewable by everyone" ON public.pages;
CREATE POLICY "Published pages are viewable by everyone"
    ON public.pages FOR SELECT
    USING (published_at IS NOT NULL);

DROP POLICY IF EXISTS "Users can view their own pages" ON public.pages;
CREATE POLICY "Users can view their own pages"
    ON public.pages FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own pages" ON public.pages;
CREATE POLICY "Users can insert their own pages"
    ON public.pages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own pages" ON public.pages;
CREATE POLICY "Users can update their own pages"
    ON public.pages FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own pages" ON public.pages;
CREATE POLICY "Users can delete their own pages"
    ON public.pages FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON public.user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- SECURE USAGE FUNCTIONS & TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_site_limit()
RETURNS TRIGGER AS $$
DECLARE
    site_count integer;
    user_tier text;
BEGIN
    SELECT tier INTO user_tier
    FROM public.user_subscriptions
    WHERE user_id = auth.uid();
    
    IF user_tier IS NULL THEN
        user_tier := 'free';
    END IF;

    IF user_tier = 'free' THEN
        SELECT COUNT(*) INTO site_count
        FROM public.pages
        WHERE user_id = auth.uid();
        
        IF site_count >= 1 THEN
            RAISE EXCEPTION 'Free tier users can only have 1 active site. Please delete your existing site or upgrade to Pro.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_enforce_site_limit ON public.pages;
CREATE TRIGGER trigger_enforce_site_limit
    BEFORE INSERT ON public.pages
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_site_limit();

CREATE OR REPLACE FUNCTION public.increment_usage()
RETURNS boolean AS $$
DECLARE
    current_count integer;
    user_tier text;
BEGIN
    INSERT INTO public.user_subscriptions (user_id, tier, message_count)
    VALUES (auth.uid(), 'free', 0)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT message_count, tier INTO current_count, user_tier
    FROM public.user_subscriptions
    WHERE user_id = auth.uid() FOR UPDATE;
    
    IF user_tier = 'free' AND current_count >= 3 THEN
        RETURN false;
    END IF;
    
    UPDATE public.user_subscriptions
    SET message_count = message_count + 1
    WHERE user_id = auth.uid();
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.can_create_site()
RETURNS boolean AS $$
DECLARE
    site_count integer;
    user_tier text;
BEGIN
    SELECT tier INTO user_tier
    FROM public.user_subscriptions
    WHERE user_id = auth.uid();
    
    IF user_tier IS NULL THEN
        user_tier := 'free';
    END IF;

    SELECT COUNT(*) INTO site_count
    FROM public.pages
    WHERE user_id = auth.uid();
    
    IF user_tier = 'free' AND site_count >= 1 THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_usage()
RETURNS json AS $$
DECLARE
    current_count integer;
    current_site_count integer;
    user_tier text;
BEGIN
    INSERT INTO public.user_subscriptions (user_id, tier, message_count)
    VALUES (auth.uid(), 'free', 0)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT message_count, tier INTO current_count, user_tier
    FROM public.user_subscriptions
    WHERE user_id = auth.uid();

    SELECT COUNT(*) INTO current_site_count
    FROM public.pages
    WHERE user_id = auth.uid();

    RETURN json_build_object('message_count', current_count, 'tier', user_tier, 'site_count', current_site_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
