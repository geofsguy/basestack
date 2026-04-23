ALTER TABLE public.page_view_events
    ADD COLUMN IF NOT EXISTS referrer_url TEXT,
    ADD COLUMN IF NOT EXISTS source TEXT,
    ADD COLUMN IF NOT EXISTS source_category TEXT,
    ADD COLUMN IF NOT EXISTS medium TEXT,
    ADD COLUMN IF NOT EXISTS campaign TEXT,
    ADD COLUMN IF NOT EXISTS term TEXT,
    ADD COLUMN IF NOT EXISTS content TEXT,
    ADD COLUMN IF NOT EXISTS browser TEXT,
    ADD COLUMN IF NOT EXISTS browser_version TEXT,
    ADD COLUMN IF NOT EXISTS os TEXT,
    ADD COLUMN IF NOT EXISTS device_type TEXT,
    ADD COLUMN IF NOT EXISTS viewport_width INTEGER,
    ADD COLUMN IF NOT EXISTS viewport_height INTEGER,
    ADD COLUMN IF NOT EXISTS language TEXT,
    ADD COLUMN IF NOT EXISTS timezone TEXT;

CREATE INDEX IF NOT EXISTS page_view_events_page_id_source_idx
    ON public.page_view_events (page_id, source);

CREATE INDEX IF NOT EXISTS page_view_events_page_id_device_type_idx
    ON public.page_view_events (page_id, device_type);

CREATE INDEX IF NOT EXISTS page_view_events_page_id_campaign_idx
    ON public.page_view_events (page_id, campaign);

DROP FUNCTION IF EXISTS public.record_page_view(TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.record_page_view(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.record_page_view(
    input_page_slug TEXT,
    input_visitor_token TEXT,
    input_referrer_host TEXT,
    input_context JSONB
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
    normalized_referrer_url TEXT;
    normalized_visitor_token TEXT;
    normalized_source TEXT;
    normalized_source_category TEXT;
    normalized_medium TEXT;
    normalized_campaign TEXT;
    normalized_term TEXT;
    normalized_content TEXT;
    normalized_browser TEXT;
    normalized_browser_version TEXT;
    normalized_os TEXT;
    normalized_device_type TEXT;
    normalized_viewport_width INTEGER;
    normalized_viewport_height INTEGER;
    normalized_language TEXT;
    normalized_timezone TEXT;
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

    input_context := coalesce(input_context, '{}'::jsonb);
    normalized_referrer_host := NULLIF(
        left(
            regexp_replace(
                lower(btrim(coalesce(input_referrer_host, input_context->>'referrer_host', ''))),
                '^www\.',
                ''
            ),
            120
        ),
        ''
    );
    normalized_referrer_url := NULLIF(left(btrim(coalesce(input_context->>'referrer_url', '')), 500), '');
    normalized_source := NULLIF(left(btrim(coalesce(input_context->>'source', normalized_referrer_host, 'Direct')), 120), '');
    normalized_source := coalesce(normalized_source, 'Direct');
    normalized_medium := NULLIF(left(lower(btrim(coalesce(input_context->>'medium', ''))), 80), '');
    normalized_campaign := NULLIF(left(btrim(coalesce(input_context->>'campaign', '')), 160), '');
    normalized_term := NULLIF(left(btrim(coalesce(input_context->>'term', '')), 160), '');
    normalized_content := NULLIF(left(btrim(coalesce(input_context->>'content', '')), 160), '');
    normalized_browser := NULLIF(left(btrim(coalesce(input_context->>'browser', 'Unknown')), 80), '');
    normalized_browser_version := NULLIF(left(btrim(coalesce(input_context->>'browser_version', '')), 40), '');
    normalized_os := NULLIF(left(btrim(coalesce(input_context->>'os', 'Unknown')), 80), '');
    normalized_device_type := lower(NULLIF(left(btrim(coalesce(input_context->>'device_type', 'desktop')), 40), ''));
    normalized_device_type := CASE
        WHEN normalized_device_type IN ('desktop', 'mobile', 'tablet', 'bot') THEN normalized_device_type
        ELSE 'desktop'
    END;
    normalized_viewport_width := CASE
        WHEN coalesce(input_context->>'viewport_width', '') ~ '^[0-9]{2,5}$' THEN (input_context->>'viewport_width')::INTEGER
        ELSE NULL
    END;
    normalized_viewport_height := CASE
        WHEN coalesce(input_context->>'viewport_height', '') ~ '^[0-9]{2,5}$' THEN (input_context->>'viewport_height')::INTEGER
        ELSE NULL
    END;
    normalized_language := NULLIF(left(lower(btrim(coalesce(input_context->>'language', ''))), 40), '');
    normalized_timezone := NULLIF(left(btrim(coalesce(input_context->>'timezone', '')), 80), '');
    normalized_source_category := CASE
        WHEN lower(normalized_source) = 'direct' THEN 'direct'
        WHEN normalized_medium = 'email' OR lower(normalized_source) = 'email' THEN 'email'
        WHEN lower(normalized_source) = 'organic search'
          OR lower(normalized_source) LIKE '%google%'
          OR lower(normalized_source) LIKE '%bing%'
          OR lower(normalized_source) LIKE '%duckduckgo%'
          OR lower(normalized_source) LIKE '%yahoo%' THEN 'search'
        WHEN lower(normalized_source) = 'social'
          OR lower(normalized_source) LIKE '%linkedin%'
          OR lower(normalized_source) LIKE '%twitter%'
          OR lower(normalized_source) LIKE '%x.com%'
          OR lower(normalized_source) LIKE '%facebook%'
          OR lower(normalized_source) LIKE '%instagram%'
          OR lower(normalized_source) LIKE '%threads%'
          OR lower(normalized_source) LIKE '%reddit%' THEN 'social'
        WHEN normalized_campaign IS NOT NULL OR normalized_medium IS NOT NULL THEN 'campaign'
        ELSE 'referral'
    END;

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

    INSERT INTO public.page_view_events (
        page_id,
        visitor_token,
        referrer_host,
        referrer_url,
        source,
        source_category,
        medium,
        campaign,
        term,
        content,
        browser,
        browser_version,
        os,
        device_type,
        viewport_width,
        viewport_height,
        language,
        timezone
    )
    VALUES (
        target_page_id,
        normalized_visitor_token,
        normalized_referrer_host,
        normalized_referrer_url,
        normalized_source,
        normalized_source_category,
        normalized_medium,
        normalized_campaign,
        normalized_term,
        normalized_content,
        normalized_browser,
        normalized_browser_version,
        normalized_os,
        normalized_device_type,
        normalized_viewport_width,
        normalized_viewport_height,
        normalized_language,
        normalized_timezone
    );

    RETURN TRUE;
END;
$func$;

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
BEGIN
    RETURN public.record_page_view(
        input_page_slug,
        input_visitor_token,
        input_referrer_host,
        jsonb_build_object(
            'referrer_host', input_referrer_host,
            'source', coalesce(nullif(input_referrer_host, ''), 'Direct')
        )
    );
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
    views_last_30_days INTEGER;
    returning_visitors INTEGER;
    direct_views INTEGER;
    referral_views INTEGER;
    social_views INTEGER;
    search_views INTEGER;
    average_daily_views NUMERIC;
    last_viewed_at_value TIMESTAMP WITH TIME ZONE;
    trend JSON;
    top_referrers JSON;
    top_sources JSON;
    devices JSON;
    browsers JSON;
    operating_systems JSON;
    campaigns JSON;
    recent_views JSON;
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
        count(*) FILTER (
            WHERE viewed_at >= timezone('utc'::text, now()) - interval '30 days'
        )::INTEGER,
        count(*) FILTER (WHERE coalesce(source_category, 'direct') = 'direct')::INTEGER,
        count(*) FILTER (WHERE coalesce(source_category, 'direct') <> 'direct')::INTEGER,
        count(*) FILTER (WHERE source_category = 'social')::INTEGER,
        count(*) FILTER (WHERE source_category = 'search')::INTEGER,
        round((count(*) FILTER (
            WHERE viewed_at >= timezone('utc'::text, now()) - interval '30 days'
        )::NUMERIC / 30), 1),
        max(viewed_at)
    INTO
        total_views,
        unique_visitors,
        views_last_7_days,
        views_last_30_days,
        direct_views,
        referral_views,
        social_views,
        search_views,
        average_daily_views,
        last_viewed_at_value
    FROM public.page_view_events
    WHERE page_id = input_page_id;

    SELECT count(*)::INTEGER
    INTO returning_visitors
    FROM (
        SELECT visitor_token
        FROM public.page_view_events
        WHERE page_id = input_page_id
        GROUP BY visitor_token
        HAVING count(*) > 1
    ) AS returning_rows;

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
            timezone('utc'::text, now())::date - 29,
            timezone('utc'::text, now())::date,
            interval '1 day'
        ) AS series(day)
        LEFT JOIN (
            SELECT
                timezone('utc'::text, viewed_at)::date AS day,
                count(*)::INTEGER AS view_count
            FROM public.page_view_events
            WHERE page_id = input_page_id
              AND viewed_at >= timezone('utc'::text, now()) - interval '30 days'
            GROUP BY timezone('utc'::text, viewed_at)::date
        ) AS counts
            ON counts.day = series.day::date
    ) AS trend_rows;

    SELECT coalesce(json_agg(json_build_object('source', source, 'views', view_count) ORDER BY view_count DESC, source ASC), '[]'::json)
    INTO top_referrers
    FROM (
        SELECT
            coalesce(nullif(referrer_host, ''), 'Direct') AS source,
            count(*)::INTEGER AS view_count
        FROM public.page_view_events
        WHERE page_id = input_page_id
        GROUP BY 1
        ORDER BY view_count DESC, source ASC
        LIMIT 8
    ) AS referrer_rows;

    SELECT coalesce(json_agg(json_build_object('source', source, 'views', view_count) ORDER BY view_count DESC, source ASC), '[]'::json)
    INTO top_sources
    FROM (
        SELECT
            coalesce(nullif(source, ''), coalesce(nullif(referrer_host, ''), 'Direct')) AS source,
            count(*)::INTEGER AS view_count
        FROM public.page_view_events
        WHERE page_id = input_page_id
        GROUP BY 1
        ORDER BY view_count DESC, source ASC
        LIMIT 8
    ) AS source_rows;

    SELECT coalesce(json_agg(json_build_object('name', label, 'views', view_count) ORDER BY view_count DESC, label ASC), '[]'::json)
    INTO devices
    FROM (
        SELECT coalesce(nullif(device_type, ''), 'unknown') AS label, count(*)::INTEGER AS view_count
        FROM public.page_view_events
        WHERE page_id = input_page_id
        GROUP BY 1
        ORDER BY view_count DESC, label ASC
    ) AS device_rows;

    SELECT coalesce(json_agg(json_build_object('name', label, 'views', view_count) ORDER BY view_count DESC, label ASC), '[]'::json)
    INTO browsers
    FROM (
        SELECT coalesce(nullif(browser, ''), 'Unknown') AS label, count(*)::INTEGER AS view_count
        FROM public.page_view_events
        WHERE page_id = input_page_id
        GROUP BY 1
        ORDER BY view_count DESC, label ASC
        LIMIT 8
    ) AS browser_rows;

    SELECT coalesce(json_agg(json_build_object('name', label, 'views', view_count) ORDER BY view_count DESC, label ASC), '[]'::json)
    INTO operating_systems
    FROM (
        SELECT coalesce(nullif(os, ''), 'Unknown') AS label, count(*)::INTEGER AS view_count
        FROM public.page_view_events
        WHERE page_id = input_page_id
        GROUP BY 1
        ORDER BY view_count DESC, label ASC
        LIMIT 8
    ) AS os_rows;

    SELECT coalesce(json_agg(json_build_object('name', label, 'views', view_count) ORDER BY view_count DESC, label ASC), '[]'::json)
    INTO campaigns
    FROM (
        SELECT coalesce(nullif(campaign, ''), 'Unattributed') AS label, count(*)::INTEGER AS view_count
        FROM public.page_view_events
        WHERE page_id = input_page_id
        GROUP BY 1
        ORDER BY view_count DESC, label ASC
        LIMIT 8
    ) AS campaign_rows;

    SELECT coalesce(json_agg(
        json_build_object(
            'viewed_at', viewed_at,
            'source', coalesce(nullif(source, ''), coalesce(nullif(referrer_host, ''), 'Direct')),
            'device_type', coalesce(nullif(device_type, ''), 'unknown'),
            'browser', coalesce(nullif(browser, ''), 'Unknown'),
            'os', coalesce(nullif(os, ''), 'Unknown')
        )
        ORDER BY viewed_at DESC
    ), '[]'::json)
    INTO recent_views
    FROM (
        SELECT viewed_at, source, referrer_host, device_type, browser, os
        FROM public.page_view_events
        WHERE page_id = input_page_id
        ORDER BY viewed_at DESC
        LIMIT 10
    ) AS recent_rows;

    RETURN json_build_object(
        'page_id', input_page_id,
        'total_views', coalesce(total_views, 0),
        'unique_visitors', coalesce(unique_visitors, 0),
        'views_last_7_days', coalesce(views_last_7_days, 0),
        'views_last_30_days', coalesce(views_last_30_days, 0),
        'returning_visitors', coalesce(returning_visitors, 0),
        'direct_views', coalesce(direct_views, 0),
        'referral_views', coalesce(referral_views, 0),
        'social_views', coalesce(social_views, 0),
        'search_views', coalesce(search_views, 0),
        'average_daily_views', coalesce(average_daily_views, 0),
        'last_viewed_at', last_viewed_at_value,
        'trend', trend,
        'top_referrers', top_referrers,
        'top_sources', top_sources,
        'devices', devices,
        'browsers', browsers,
        'operating_systems', operating_systems,
        'campaigns', campaigns,
        'recent_views', recent_views
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
                'views_last_30_days', views_last_30_days,
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
                count(e.id) FILTER (
                    WHERE e.viewed_at >= timezone('utc'::text, now()) - interval '30 days'
                )::INTEGER AS views_last_30_days,
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

GRANT EXECUTE ON FUNCTION public.record_page_view(TEXT, TEXT, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_page_view(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_site_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_site_analytics_overview() TO authenticated;
