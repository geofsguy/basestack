import React, { useEffect, useState } from 'react';
import Logo from './Logo';
import { supabase } from '../supabaseClient';
import { isPremiumTier } from '../lib/plan';

interface WatermarkProps {
  pageId?: string | null;
  slug?: string | null;
}

/**
 * Unremovable BaseStack watermark badge shown on free-tier sites.
 * Hidden automatically for Pro and Studio subscribers.
 *
 * Rendered in the React DOM layer OUTSIDE the site iframe — no amount
 * of AI refinement or HTML editing can remove it.
 */
export default function Watermark({ pageId, slug }: WatermarkProps) {
  const [show, setShow] = useState(true); // optimistic: show while loading

  useEffect(() => {
    let isMounted = true;

    // Silently check whether the site owner should have the badge removed.
    // If the request fails for any reason, the watermark stays visible.
    (async () => {
      try {
        if (pageId || slug) {
          const { data } = await supabase.rpc('should_show_watermark_for_page', {
            p_page_id: pageId || null,
            p_slug: slug || null,
          });
          if (isMounted && typeof data === 'boolean') {
            setShow(data);
          }
          return;
        }

        // Fallback for unsaved previews: use the current user's plan.
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; // not logged in → show watermark
        const { data } = await supabase.rpc('get_usage');
        if (isMounted && data && typeof data.tier === 'string') {
          setShow(!isPremiumTier(data.tier));
        }
      } catch {
        // any failure → keep showing the watermark
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [pageId, slug]);

  if (!show) return null;

  return (
    <a
      href="/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Made with BaseStack"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 2147483647,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 14px 8px 10px',
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '999px',
        textDecoration: 'none',
        color: '#ffffff',
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: '12px',
        fontWeight: 600,
        letterSpacing: '0.01em',
        boxShadow: '0 4px 24px rgba(0,0,0,0.25), 0 1px 4px rgba(0,0,0,0.15)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        pointerEvents: 'auto',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLAnchorElement).style.boxShadow =
          '0 8px 30px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.2)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLAnchorElement).style.boxShadow =
          '0 4px 24px rgba(0,0,0,0.25), 0 1px 4px rgba(0,0,0,0.15)';
      }}
    >
      <Logo className="w-4 h-4" style={{ color: '#ffffff', flexShrink: 0 } as React.CSSProperties} />
      <span style={{ opacity: 0.6, fontWeight: 400, fontSize: '11px' }}>Made with</span>
      <span style={{ letterSpacing: '0.02em' }}>BaseStack</span>
    </a>
  );
}
