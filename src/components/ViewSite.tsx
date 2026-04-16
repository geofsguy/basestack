import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Loader2, ArrowLeft, Globe } from 'lucide-react';
import Watermark from './Watermark';
import { buildSiteDocument } from '../services/siteDocument';
import { sanitizeGeneratedHtml } from '../services/htmlSanitizer';

export default function ViewSite() {
  const { id } = useParams<{ id: string }>();
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      fetchPage();
    }
  }, [id]);

  const fetchPage = async () => {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('html')
        .eq('id', id)
        .single();

      if (error) throw error;
      setHtml(data.html);
    } catch (err: any) {
      console.error('Error fetching page:', err);
      setError(err.message || 'Failed to load the site.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-10 h-10 text-black animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading your site...</p>
      </div>
    );
  }

  if (error || !html) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
          <Globe className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h2>
        <p className="text-gray-500 mb-8 max-w-sm">{error || "We couldn't find the site you're looking for."}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center px-6 py-3 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </button>
      </div>
    );
  }

  const htmlDoc = buildSiteDocument(sanitizeGeneratedHtml(html));

  return (
    <div className="h-screen w-full bg-white relative overflow-hidden">
        <div className="absolute top-4 left-4 z-50">
            <button 
                onClick={() => navigate('/dashboard')}
                className="bg-white/90 backdrop-blur-md border border-gray-200 text-black px-4 py-2 rounded-full text-sm font-medium shadow-sm flex items-center hover:bg-white transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
            </button>
        </div>
      <iframe 
        srcDoc={htmlDoc}
        className="w-full h-full border-none"
        title="View Site"
        sandbox="allow-scripts"
      />
      <Watermark />
    </div>
  );
}
