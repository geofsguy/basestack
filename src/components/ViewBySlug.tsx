import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Loader2, Globe, ArrowLeft } from 'lucide-react';
import Watermark from './Watermark';
import { buildSiteDocument } from '../services/siteDocument';
import { sanitizeGeneratedHtml } from '../services/htmlSanitizer';
import { trackPublishedPageView } from '../services/analytics';

export default function ViewBySlug() {
  const { slug } = useParams<{ slug: string }>();
  const [pageId, setPageId] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (slug) fetchBySlug();
  }, [slug]);

  const fetchBySlug = async () => {
    try {
      setPageId(null);
      const { data, error } = await supabase
        .from('pages')
        .select('id, html')
        .eq('slug', slug)
        .not('published_at', 'is', null)
        .maybeSingle();

      if (error) throw error;
      if (!data) { setNotFound(true); return; }
      setPageId(data.id);
      setHtml(data.html);
      void trackPublishedPageView(slug).catch((trackingError) => {
        console.warn('Analytics tracking failed:', trackingError);
      });
    } catch (err) {
      console.error('Error loading site:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading site…</p>
      </div>
    );
  }

  if (notFound || !html) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center font-sans"
        style={{ background: 'radial-gradient(ellipse at 60% 0%, #eef2ff 0%, #f8fafc 60%)' }}
      >
        <div className="w-20 h-20 rounded-3xl bg-white border border-gray-100 shadow-lg flex items-center justify-center mb-6">
          <Globe className="w-10 h-10 text-indigo-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          /{slug} isn't here
        </h1>
        <p className="text-gray-500 mb-8 max-w-xs leading-relaxed">
          This page hasn't been published yet, or the handle doesn't exist. Want to build your own?
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-full text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
          >
            Create your site — it's free
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center px-6 py-3 border border-gray-200 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go back
          </button>
        </div>
      </div>
    );
  }

  const htmlDoc = buildSiteDocument(sanitizeGeneratedHtml(html));

  return (
    <div className="h-screen w-full bg-white">
      <iframe
        srcDoc={htmlDoc}
        className="w-full h-full border-none"
        title={`${slug}'s site`}
        sandbox="allow-scripts"
      />
      <Watermark pageId={pageId} slug={slug} />
    </div>
  );
}
