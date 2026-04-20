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

ALTER TABLE public.site_auto_maintain_settings ENABLE ROW LEVEL SECURITY;

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
