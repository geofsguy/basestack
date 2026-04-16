import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Globe, Check, Loader2, Copy, CheckCheck, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface PublishModalProps {
  pageId: string;
  existingSlug?: string | null;
  existingPublishedAt?: string | null;
  onClose: () => void;
  onPublished: (details: { slug: string; publishedAt: string }) => void;
}

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function PublishModal({
  pageId,
  existingSlug,
  existingPublishedAt,
  onClose,
  onPublished,
}: PublishModalProps) {
  const [slug, setSlug] = useState(existingSlug || '');
  const [slugStatus, setSlugStatus] = useState<SlugStatus>(existingSlug ? 'available' : 'idle');
  const [isPublishing, setIsPublishing] = useState(false);
  const [published, setPublished] = useState(!!existingPublishedAt);
  const [publishedSlug, setPublishedSlug] = useState(existingSlug || '');
  const [copied, setCopied] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const liveUrl = `${window.location.origin}/s/${publishedSlug}`;

  const checkAvailability = useCallback(async (value: string) => {
    if (!value || value.length < 2) {
      setSlugStatus(value.length === 0 ? 'idle' : 'invalid');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(value)) {
      setSlugStatus('invalid');
      return;
    }
    if (value === existingSlug) {
      setSlugStatus('available');
      return;
    }
    setSlugStatus('checking');
    const { data, error } = await supabase
      .from('pages')
      .select('id')
      .eq('slug', value)
      .maybeSingle();

    if (error) { setSlugStatus('idle'); return; }
    setSlugStatus(data ? 'taken' : 'available');
  }, [existingSlug]);

  useEffect(() => {
    const trimmed = slug.trim();
    if (trimmed === existingSlug) { setSlugStatus('available'); return; }
    setSlugStatus('idle');
    const timer = setTimeout(() => checkAvailability(trimmed), 450);
    return () => clearTimeout(timer);
  }, [slug, checkAvailability, existingSlug]);

  const handlePublish = async () => {
    if (slugStatus !== 'available' || isPublishing) return;
    setIsPublishing(true);
    setPublishError(null);
    try {
      const { data, error } = await supabase
        .from('pages')
        .update({ slug: slug.trim(), published_at: new Date().toISOString() })
        .eq('id', pageId)
        .select('slug, published_at')
        .maybeSingle();

      if (error) throw error;
      if (!data?.slug || !data.published_at) {
        throw new Error('Publish was blocked before Supabase saved it. This usually means the `pages` table is missing an UPDATE policy for the signed-in user.');
      }

      setPublishedSlug(data.slug);
      setPublished(true);
      onPublished({ slug: data.slug, publishedAt: data.published_at });
    } catch (err: any) {
      console.error('Publish failed:', err);
      if (err?.code === '23505') {
        setPublishError('That handle is already in use. Try another one.');
      } else {
        setPublishError(err.message || 'Publishing failed. Please check your Supabase table columns and RLS policies.');
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(liveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSlugInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (publishError) setPublishError(null);
    setSlug(slugify(e.target.value));
  };

  const StatusIndicator = () => {
    if (slugStatus === 'checking') return (
      <span className="flex items-center text-xs text-gray-400 font-medium">
        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Checking…
      </span>
    );
    if (slugStatus === 'available' && slug) return (
      <span className="flex items-center text-xs text-gray-900 font-medium">
        <Check className="w-3.5 h-3.5 mr-1" />Available
      </span>
    );
    if (slugStatus === 'taken') return (
      <span className="flex items-center text-xs text-gray-500 font-medium">
        <AlertCircle className="w-3.5 h-3.5 mr-1" />Already taken
      </span>
    );
    if (slugStatus === 'invalid') return (
      <span className="flex items-center text-xs text-gray-400 font-medium">
        <AlertCircle className="w-3.5 h-3.5 mr-1" />Lowercase letters, numbers, hyphens only
      </span>
    );
    return null;
  };

  const canPublish = slugStatus === 'available' && slug.length > 0 && !isPublishing;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      >
        {/* Modal */}
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-white rounded-[2rem] shadow-2xl shadow-black/10 w-full max-w-md overflow-hidden border border-gray-100"
        >
          {/* Dot grid texture */}
          <div
            className="absolute inset-0 z-0 opacity-[0.025] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}
          />

          <div className="relative z-10 p-8">
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {!published ? (
              <>
                {/* Header */}
                <div className="mb-7">
                  <div className="w-12 h-12 bg-black rounded-[14px] flex items-center justify-center mb-5 shadow-xl shadow-black/10">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-medium tracking-tight text-gray-900 mb-1.5">Publish your site</h2>
                  <p className="text-gray-500 text-[15px] leading-relaxed">Claim a handle to get your live, shareable link.</p>
                </div>

                {/* URL preview pill */}
                <div className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 mb-6 font-mono text-[13px] leading-relaxed">
                  <span className="text-gray-400">{window.location.origin}/s/</span>
                  <span className={`font-semibold ${slug ? 'text-gray-900' : 'text-gray-300'}`}>
                    {slug || 'yourname'}
                  </span>
                </div>

                {/* Slug input */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Your handle</label>
                    <div className="h-4 flex items-center">
                      <StatusIndicator />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={slug}
                    onChange={handleSlugInput}
                    placeholder="yourname"
                    maxLength={48}
                    autoFocus
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-900 text-[15px] font-medium placeholder:text-gray-300 outline-none transition-all focus:border-gray-400 focus:ring-1 focus:ring-gray-900/10"
                  />
                </div>

                {publishError && (
                  <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700">
                    {publishError}
                  </div>
                )}

                {/* Publish CTA */}
                <button
                  onClick={handlePublish}
                  disabled={!canPublish}
                  className="w-full flex items-center justify-center px-6 py-3.5 rounded-full bg-black text-white text-[15px] font-medium hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-xl shadow-black/10"
                >
                  {isPublishing ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Publishing…</>
                  ) : (
                    'Publish Site'
                  )}
                </button>
              </>
            ) : (
              /* ── Success State ── */
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Header */}
                <div className="mb-7">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 14, stiffness: 260, delay: 0.05 }}
                    className="w-12 h-12 bg-black rounded-[14px] flex items-center justify-center mb-5 shadow-xl shadow-black/10"
                  >
                    <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </motion.div>
                  <h2 className="text-2xl font-medium tracking-tight text-gray-900 mb-1.5">You're live</h2>
                  <p className="text-gray-500 text-[15px]">Your site is public and shareable right now.</p>
                </div>

                {/* URL copy row */}
                <div className="bg-gray-50 border border-gray-100 rounded-2xl flex items-center gap-3 px-5 py-4 mb-5">
                  <span className="text-[13px] font-mono text-gray-700 truncate flex-1">{liveUrl}</span>
                  <button
                    onClick={handleCopy}
                    className={`flex-shrink-0 flex items-center px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      copied
                        ? 'bg-black text-white border-black'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900'
                    }`}
                  >
                    {copied
                      ? <><CheckCheck className="w-3.5 h-3.5 mr-1" />Copied</>
                      : <><Copy className="w-3.5 h-3.5 mr-1" />Copy</>
                    }
                  </button>
                </div>

                <div className="flex gap-3">
                  <a
                    href={liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center px-5 py-3 rounded-full bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors shadow-xl shadow-black/10"
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Open Site
                  </a>
                  <button
                    onClick={onClose}
                    className="flex-1 px-5 py-3 rounded-full border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
