CREATE OR REPLACE FUNCTION public.should_show_watermark_for_page(
    p_page_id UUID DEFAULT NULL,
    p_slug TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    owner_id UUID;
    owner_tier TEXT;
BEGIN
    IF p_page_id IS NULL AND (p_slug IS NULL OR btrim(p_slug) = '') THEN
        RETURN TRUE;
    END IF;

    SELECT user_id
    INTO owner_id
    FROM public.pages
    WHERE
        (
            p_page_id IS NOT NULL
            AND id = p_page_id
            AND (published_at IS NOT NULL OR auth.uid() = user_id)
        )
        OR (
            p_page_id IS NULL
            AND p_slug IS NOT NULL
            AND slug = p_slug
            AND published_at IS NOT NULL
        )
    LIMIT 1;

    IF owner_id IS NULL THEN
        RETURN TRUE;
    END IF;

    SELECT lower(coalesce(tier, 'free'))
    INTO owner_tier
    FROM public.user_subscriptions
    WHERE user_id = owner_id;

    RETURN coalesce(owner_tier, 'free') NOT IN ('pro', 'studio');
END;
$func$;

GRANT EXECUTE ON FUNCTION public.should_show_watermark_for_page(UUID, TEXT) TO anon, authenticated;
