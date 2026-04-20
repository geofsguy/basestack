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

CREATE TABLE IF NOT EXISTS public.site_auto_maintain_settings (
    page_id UUID PRIMARY KEY REFERENCES public.pages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    allowed_scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    maintenance_mode TEXT NOT NULL DEFAULT 'suggest_only',
    trigger_rules JSONB NOT NULL DEFAULT jsonb_build_object(
        'profile_updates', TRUE,
        'project_changes', TRUE,
        'testimonial_changes', TRUE,
        'blog_news_changes', TRUE,
        'seo_drift', TRUE,
        'design_review_window', TRUE
    ),
    last_evaluated_at TIMESTAMP WITH TIME ZONE,
    last_applied_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT site_auto_maintain_settings_mode_check
        CHECK (maintenance_mode IN ('suggest_only', 'smart_approve', 'fully_automatic'))
);

CREATE INDEX IF NOT EXISTS site_auto_maintain_settings_user_id_idx
    ON public.site_auto_maintain_settings (user_id);

CREATE TABLE IF NOT EXISTS public.page_view_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    visitor_token TEXT NOT NULL,
    referrer_host TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS page_view_events_page_id_viewed_at_idx
    ON public.page_view_events (page_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS page_view_events_page_id_visitor_token_idx
    ON public.page_view_events (page_id, visitor_token);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_auto_maintain_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_view_events ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Users can view their own auto maintain settings" ON public.site_auto_maintain_settings;
CREATE POLICY "Users can view their own auto maintain settings"
    ON public.site_auto_maintain_settings
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own auto maintain settings" ON public.site_auto_maintain_settings;
CREATE POLICY "Users can insert their own auto maintain settings"
    ON public.site_auto_maintain_settings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own auto maintain settings" ON public.site_auto_maintain_settings;
CREATE POLICY "Users can update their own auto maintain settings"
    ON public.site_auto_maintain_settings
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own auto maintain settings" ON public.site_auto_maintain_settings;
CREATE POLICY "Users can delete their own auto maintain settings"
    ON public.site_auto_maintain_settings
    FOR DELETE
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

DROP TRIGGER IF EXISTS update_site_auto_maintain_settings_updated_at ON public.site_auto_maintain_settings;
CREATE TRIGGER update_site_auto_maintain_settings_updated_at
    BEFORE UPDATE ON public.site_auto_maintain_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.enforce_auto_maintain_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    owner_id UUID;
    user_tier TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'You must be signed in to manage Auto-Maintain.';
    END IF;

    SELECT user_id
    INTO owner_id
    FROM public.pages
    WHERE id = NEW.page_id;

    IF owner_id IS NULL THEN
        RAISE EXCEPTION 'Site not found.';
    END IF;

    IF NEW.user_id IS DISTINCT FROM auth.uid() OR owner_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'You can only manage Auto-Maintain for your own sites.';
    END IF;

    NEW.allowed_scopes := coalesce(NEW.allowed_scopes, ARRAY[]::TEXT[]);
    NEW.trigger_rules := coalesce(
        NEW.trigger_rules,
        jsonb_build_object(
            'profile_updates', TRUE,
            'project_changes', TRUE,
            'testimonial_changes', TRUE,
            'blog_news_changes', TRUE,
            'seo_drift', TRUE,
            'design_review_window', TRUE
        )
    );

    SELECT lower(coalesce(tier, 'free'))
    INTO user_tier
    FROM public.user_subscriptions
    WHERE user_id = auth.uid();

    user_tier := coalesce(user_tier, 'free');

    IF NEW.enabled AND user_tier NOT IN ('pro', 'studio') THEN
        RAISE EXCEPTION 'Auto-Maintain is available on paid plans only.';
    END IF;

    IF NEW.enabled AND coalesce(array_length(NEW.allowed_scopes, 1), 0) = 0 THEN
        RAISE EXCEPTION 'Select at least one section before enabling Auto-Maintain.';
    END IF;

    RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trigger_enforce_auto_maintain_access ON public.site_auto_maintain_settings;
CREATE TRIGGER trigger_enforce_auto_maintain_access
    BEFORE INSERT OR UPDATE ON public.site_auto_maintain_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_auto_maintain_access();

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

DROP FUNCTION IF EXISTS public.record_page_view(TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.record_page_view(
    input_page_slug TEXT,
    input_visitor_token TEXT,
    input_referrer_host TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    target_page_id UUID;
    target_owner_id UUID;
    normalized_referrer_host TEXT;
    has_recent_view BOOLEAN;
BEGIN
    IF input_page_slug IS NULL OR btrim(input_page_slug) = '' THEN
        RETURN FALSE;
    END IF;

    IF input_visitor_token IS NULL OR btrim(input_visitor_token) = '' THEN
        RETURN FALSE;
    END IF;

    SELECT id, user_id
    INTO target_page_id, target_owner_id
    FROM public.pages
    WHERE slug = btrim(input_page_slug)
      AND published_at IS NOT NULL
    LIMIT 1;

    IF target_page_id IS NULL THEN
        RETURN FALSE;
    END IF;

    IF auth.uid() IS NOT NULL AND auth.uid() = target_owner_id THEN
        RETURN FALSE;
    END IF;

    normalized_referrer_host := NULLIF(left(lower(coalesce(input_referrer_host, '')), 120), '');

    SELECT EXISTS (
        SELECT 1
        FROM public.page_view_events
        WHERE page_id = target_page_id
          AND visitor_token = left(input_visitor_token, 120)
          AND viewed_at >= timezone('utc'::text, now()) - interval '30 minutes'
    )
    INTO has_recent_view;

    IF has_recent_view THEN
        RETURN FALSE;
    END IF;

    INSERT INTO public.page_view_events (page_id, visitor_token, referrer_host)
    VALUES (target_page_id, left(input_visitor_token, 120), normalized_referrer_host);

    RETURN TRUE;
END;
$func$;

DROP FUNCTION IF EXISTS public.get_site_analytics(UUID);
CREATE OR REPLACE FUNCTION public.get_site_analytics(input_page_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    owner_id UUID;
    user_tier TEXT;
    total_views INTEGER;
    unique_visitors INTEGER;
    views_last_7_days INTEGER;
    last_viewed_at_value TIMESTAMP WITH TIME ZONE;
    trend JSON;
    top_referrers JSON;
BEGIN
    SELECT user_id
    INTO owner_id
    FROM public.pages
    WHERE id = input_page_id;

    IF owner_id IS NULL THEN
        RAISE EXCEPTION 'Site not found.';
    END IF;

    IF auth.uid() IS DISTINCT FROM owner_id THEN
        RAISE EXCEPTION 'You do not have access to this site analytics.';
    END IF;

    SELECT lower(coalesce(tier, 'free'))
    INTO user_tier
    FROM public.user_subscriptions
    WHERE user_id = auth.uid();

    user_tier := coalesce(user_tier, 'free');

    IF user_tier NOT IN ('pro', 'studio') THEN
        RAISE EXCEPTION 'Site analytics is available on Premium and Studio plans.';
    END IF;

    SELECT
        count(*)::INTEGER,
        count(DISTINCT visitor_token)::INTEGER,
        count(*) FILTER (
            WHERE viewed_at >= timezone('utc'::text, now()) - interval '7 days'
        )::INTEGER,
        max(viewed_at)
    INTO total_views, unique_visitors, views_last_7_days, last_viewed_at_value
    FROM public.page_view_events
    WHERE page_id = input_page_id;

    SELECT coalesce(
        json_agg(
            json_build_object(
                'date', day::date,
                'views', view_count
            )
            ORDER BY day
        ),
        '[]'::json
    )
    INTO trend
    FROM (
        SELECT
            series.day,
            coalesce(counts.view_count, 0) AS view_count
        FROM generate_series(
            timezone('utc'::text, now())::date - 13,
            timezone('utc'::text, now())::date,
            interval '1 day'
        ) AS series(day)
        LEFT JOIN (
            SELECT
                viewed_at::date AS day,
                count(*)::INTEGER AS view_count
            FROM public.page_view_events
            WHERE page_id = input_page_id
              AND viewed_at >= timezone('utc'::text, now()) - interval '14 days'
            GROUP BY viewed_at::date
        ) AS counts
            ON counts.day = series.day::date
    ) AS trend_rows;

    SELECT coalesce(
        json_agg(
            json_build_object(
                'source', source,
                'views', view_count
            )
            ORDER BY view_count DESC, source ASC
        ),
        '[]'::json
    )
    INTO top_referrers
    FROM (
        SELECT
            coalesce(nullif(referrer_host, ''), 'Direct') AS source,
            count(*)::INTEGER AS view_count
        FROM public.page_view_events
        WHERE page_id = input_page_id
        GROUP BY 1
        ORDER BY view_count DESC, source ASC
        LIMIT 5
    ) AS referrer_rows;

    RETURN json_build_object(
        'page_id', input_page_id,
        'total_views', coalesce(total_views, 0),
        'unique_visitors', coalesce(unique_visitors, 0),
        'views_last_7_days', coalesce(views_last_7_days, 0),
        'last_viewed_at', last_viewed_at_value,
        'trend', trend,
        'top_referrers', top_referrers
    );
END;
$func$;

DROP FUNCTION IF EXISTS public.get_site_analytics_overview();
CREATE OR REPLACE FUNCTION public.get_site_analytics_overview()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    user_tier TEXT;
BEGIN
    SELECT lower(coalesce(tier, 'free'))
    INTO user_tier
    FROM public.user_subscriptions
    WHERE user_id = auth.uid();

    user_tier := coalesce(user_tier, 'free');

    IF user_tier NOT IN ('pro', 'studio') THEN
        RAISE EXCEPTION 'Site analytics is available on Premium and Studio plans.';
    END IF;

    RETURN coalesce((
        SELECT json_agg(
            json_build_object(
                'page_id', page_id,
                'total_views', total_views,
                'unique_visitors', unique_visitors,
                'views_last_7_days', views_last_7_days,
                'last_viewed_at', last_viewed_at
            )
            ORDER BY published_at DESC
        )
        FROM (
            SELECT
                p.id AS page_id,
                p.published_at,
                count(e.id)::INTEGER AS total_views,
                count(DISTINCT e.visitor_token)::INTEGER AS unique_visitors,
                count(e.id) FILTER (
                    WHERE e.viewed_at >= timezone('utc'::text, now()) - interval '7 days'
                )::INTEGER AS views_last_7_days,
                max(e.viewed_at) AS last_viewed_at
            FROM public.pages AS p
            LEFT JOIN public.page_view_events AS e
                ON e.page_id = p.id
            WHERE p.user_id = auth.uid()
              AND p.published_at IS NOT NULL
            GROUP BY p.id, p.published_at
        ) AS analytics_rows
    ), '[]'::json);
END;
$func$;

GRANT EXECUTE ON FUNCTION public.record_page_view(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_site_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_site_analytics_overview() TO authenticated;
