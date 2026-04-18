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

ALTER TABLE public.page_view_events ENABLE ROW LEVEL SECURITY;

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
    normalized_visitor_token TEXT;
    has_recent_view BOOLEAN;
BEGIN
    IF input_page_slug IS NULL OR btrim(input_page_slug) = '' THEN
        RETURN FALSE;
    END IF;

    IF input_visitor_token IS NULL OR btrim(input_visitor_token) = '' THEN
        RETURN FALSE;
    END IF;

    normalized_visitor_token := left(btrim(input_visitor_token), 120);

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
          AND visitor_token = normalized_visitor_token
          AND viewed_at >= timezone('utc'::text, now()) - interval '30 minutes'
    )
    INTO has_recent_view;

    IF has_recent_view THEN
        RETURN FALSE;
    END IF;

    INSERT INTO public.page_view_events (page_id, visitor_token, referrer_host)
    VALUES (target_page_id, normalized_visitor_token, normalized_referrer_host);

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
