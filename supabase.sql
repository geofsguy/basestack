CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tree JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tier TEXT NOT NULL DEFAULT 'free',
    message_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_subscriptions
    ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
    ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
    ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'inactive',
    ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS user_subscriptions_stripe_customer_id_idx
    ON public.user_subscriptions (stripe_customer_id)
    WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_subscriptions_stripe_subscription_id_idx
    ON public.user_subscriptions (stripe_subscription_id)
    WHERE stripe_subscription_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    vibe TEXT,
    html TEXT NOT NULL,
    slug TEXT UNIQUE,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.pages
    ADD COLUMN IF NOT EXISTS generation_mode TEXT NOT NULL DEFAULT 'html',
    ADD COLUMN IF NOT EXISTS framework TEXT,
    ADD COLUMN IF NOT EXISTS project_files JSONB;

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile tree" ON public.user_profiles;
CREATE POLICY "Users can view their own profile tree"
    ON public.user_profiles
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile tree" ON public.user_profiles;
CREATE POLICY "Users can insert their own profile tree"
    ON public.user_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile tree" ON public.user_profiles;
CREATE POLICY "Users can update their own profile tree"
    ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own profile tree" ON public.user_profiles;
CREATE POLICY "Users can delete their own profile tree"
    ON public.user_profiles
    FOR DELETE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can view their own subscription"
    ON public.user_subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Published pages are viewable by everyone" ON public.pages;
CREATE POLICY "Published pages are viewable by everyone"
    ON public.pages
    FOR SELECT
    USING (published_at IS NOT NULL);

DROP POLICY IF EXISTS "Users can view their own pages" ON public.pages;
CREATE POLICY "Users can view their own pages"
    ON public.pages
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own pages" ON public.pages;
CREATE POLICY "Users can insert their own pages"
    ON public.pages
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own pages" ON public.pages;
CREATE POLICY "Users can update their own pages"
    ON public.pages
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own pages" ON public.pages;
CREATE POLICY "Users can delete their own pages"
    ON public.pages
    FOR DELETE
    USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $func$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$func$;

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

CREATE OR REPLACE FUNCTION public.enforce_site_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    site_count INTEGER;
    user_tier TEXT;
    site_limit INTEGER;
BEGIN
    SELECT tier
    INTO user_tier
    FROM public.user_subscriptions
    WHERE user_id = auth.uid();

    IF user_tier IS NULL THEN
        user_tier := 'free';
    END IF;

    IF user_tier = 'free' THEN
        site_limit := 1;
    ELSIF user_tier = 'pro' THEN
        site_limit := 5;
    ELSE
        site_limit := NULL;
    END IF;

    IF site_limit IS NOT NULL THEN
        SELECT COUNT(*)
        INTO site_count
        FROM public.pages
        WHERE user_id = auth.uid();

        IF site_count >= site_limit THEN
            RAISE EXCEPTION 'You have reached your site limit for the % plan.', user_tier;
        END IF;
    END IF;

    RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trigger_enforce_site_limit ON public.pages;
CREATE TRIGGER trigger_enforce_site_limit
    BEFORE INSERT ON public.pages
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_site_limit();

CREATE OR REPLACE FUNCTION public.increment_usage()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    current_count INTEGER;
    user_tier TEXT;
    usage_limit INTEGER;
BEGIN
    INSERT INTO public.user_subscriptions (user_id, tier, message_count)
    VALUES (auth.uid(), 'free', 0)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT message_count, tier
    INTO current_count, user_tier
    FROM public.user_subscriptions
    WHERE user_id = auth.uid()
    FOR UPDATE;

    IF user_tier = 'free' THEN
        usage_limit := 3;
    ELSIF user_tier = 'pro' THEN
        usage_limit := 20;
    ELSIF user_tier = 'studio' THEN
        usage_limit := 50;
    ELSE
        usage_limit := 3;
    END IF;

    IF current_count >= usage_limit THEN
        RETURN FALSE;
    END IF;

    UPDATE public.user_subscriptions
    SET message_count = message_count + 1
    WHERE user_id = auth.uid();

    RETURN TRUE;
END;
$func$;

CREATE OR REPLACE FUNCTION public.can_create_site()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    site_count INTEGER;
    user_tier TEXT;
    site_limit INTEGER;
BEGIN
    SELECT tier
    INTO user_tier
    FROM public.user_subscriptions
    WHERE user_id = auth.uid();

    IF user_tier IS NULL THEN
        user_tier := 'free';
    END IF;

    SELECT COUNT(*)
    INTO site_count
    FROM public.pages
    WHERE user_id = auth.uid();

    IF user_tier = 'free' THEN
        site_limit := 1;
    ELSIF user_tier = 'pro' THEN
        site_limit := 5;
    ELSE
        site_limit := NULL;
    END IF;

    IF site_limit IS NOT NULL AND site_count >= site_limit THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$func$;

CREATE OR REPLACE FUNCTION public.get_usage()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    current_count INTEGER;
    current_site_count INTEGER;
    user_tier TEXT;
    current_subscription_status TEXT;
    current_period_end_value TIMESTAMP WITH TIME ZONE;
    current_cancel_at_period_end BOOLEAN;
BEGIN
    INSERT INTO public.user_subscriptions (user_id, tier, message_count)
    VALUES (auth.uid(), 'free', 0)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT message_count, tier, subscription_status, current_period_end, cancel_at_period_end
    INTO current_count, user_tier, current_subscription_status, current_period_end_value, current_cancel_at_period_end
    FROM public.user_subscriptions
    WHERE user_id = auth.uid();

    SELECT COUNT(*)
    INTO current_site_count
    FROM public.pages
    WHERE user_id = auth.uid();

    RETURN json_build_object(
        'message_count', current_count,
        'tier', user_tier,
        'site_count', current_site_count,
        'subscription_status', current_subscription_status,
        'current_period_end', current_period_end_value,
        'cancel_at_period_end', current_cancel_at_period_end
    );
END;
$func$;
