import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wand2,
  X,
  Send,
  Loader2,
  Globe,
  MousePointer2,
  MousePointerClick,
  Bot,
  CheckCircle2,
  Clock3,
  Layers3,
  LayoutTemplate,
  MessageSquareText,
  Palette,
  Sparkles,
  Target,
  Type,
} from 'lucide-react';
import { SiteContent } from '../types';
import PublishModal from './PublishModal';
import Watermark from './Watermark';
import { buildSiteDocument } from '../services/siteDocument';
import { sanitizeGeneratedHtml } from '../services/htmlSanitizer';

interface GeneratedSiteProps {
  content: SiteContent & { id?: string; slug?: string | null; published_at?: string | null };
  onReset: () => void;
  onRefine: (prompt: string) => Promise<string | void>;
  isRefining: boolean;
  error?: string | null;
}

interface PickedElement {
  id: string;
  tag: string;
  text: string;
  classes: string;
  outerHTML: string;
}

interface RefinementMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  status?: 'thinking' | 'done' | 'error';
}

const quickActions = [
  { label: 'Sharpen hero', prompt: 'Make the hero section clearer, more premium, and more action-oriented.', icon: Target },
  { label: 'Improve layout', prompt: 'Improve the page layout, spacing, and visual hierarchy.', icon: LayoutTemplate },
  { label: 'Polish copy', prompt: 'Rewrite the copy to be concise, confident, and more compelling.', icon: Type },
  { label: 'Refresh colors', prompt: 'Refresh the color palette with a polished, distinctive direction.', icon: Palette },
];

const makeMessageId = () => Math.random().toString(36).slice(2, 10);

export default function GeneratedSite({ content, onReset, onRefine, isRefining, error }: GeneratedSiteProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [liveSlug, setLiveSlug] = useState<string | null>(content.slug || null);
  const [isLive, setIsLive] = useState(!!content.published_at);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPickerActive, setIsPickerActive] = useState(false);
  const [pickedElements, setPickedElements] = useState<PickedElement[]>([]);
  const [refinementMessages, setRefinementMessages] = useState<RefinementMessage[]>([
    {
      id: 'ready',
      role: 'ai',
      text: 'Ready to tune the page.',
      status: 'done',
    },
  ]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const sanitizedHtml = sanitizeGeneratedHtml(content.html);

  const liveUrl = liveSlug ? `${window.location.origin}/s/${liveSlug}` : null;
  const isPaidProject = content.generationMode === 'nextjs' && !!content.projectFiles?.length;

  // ── Broadcast picker state to iframe whenever it toggles ──────────────────
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const sendMessage = () => {
      iframe.contentWindow?.postMessage(
        { type: isPickerActive ? 'ENABLE_PICKER' : 'DISABLE_PICKER' },
        '*'
      );
    };

    sendMessage();
    iframe.addEventListener('load', sendMessage, { once: true });

    return () => {
      iframe.removeEventListener('load', sendMessage);
    };
  }, [isPickerActive]);

  // ── Listen for ELEMENT_SELECTED messages from iframe ─────────────────────
  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.source !== iframeRef.current?.contentWindow) return;
    if (event.origin !== 'null') return;
    if (event.data?.type !== 'ELEMENT_SELECTED') return;
    const { tag, text, classes, id: elId, outerHTML } = event.data.data as {
      tag: string;
      text: string;
      classes: string;
      id: string;
      outerHTML: string;
    };

    const newEl: PickedElement = {
      id: Math.random().toString(36).slice(2, 10),
      tag,
      text: text.slice(0, 150),
      classes,
      outerHTML: outerHTML.slice(0, 300),
    };

    setPickedElements((prev) => [...prev, newEl]);
    // Auto-open sidebar if not already open
    setIsSidebarOpen(true);
  }, []);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  // ── Disable picker when sidebar closes ────────────────────────────────────
  useEffect(() => {
    if (!isSidebarOpen) {
      setIsPickerActive(false);
    }
  }, [isSidebarOpen]);

  const handleCopyLink = async () => {
    if (!liveUrl) return;
    await navigator.clipboard.writeText(liveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePublished = ({ slug }: { slug: string; publishedAt: string }) => {
    setLiveSlug(slug);
    setIsLive(true);
  };

  const handleExportProject = async () => {
    if (!content.projectFiles?.length || isExporting) return;

    setIsExporting(true);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      content.projectFiles.forEach((file) => {
        zip.file(file.path, file.content);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${(liveSlug || content.id || 'basestack-site').replace(/[^a-z0-9-]/gi, '-').toLowerCase()}.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const removePicked = (id: string) => {
    setPickedElements((prev) => prev.filter((el) => el.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!refinementPrompt.trim() && pickedElements.length === 0) || isRefining) return;

    // Build context prefix from picked elements
    let contextPrefix = '';
    if (pickedElements.length > 0) {
      const elementDescriptions = pickedElements
        .map((el) => {
          const textSnippet = el.text ? ` "${el.text}"` : '';
          return `  - <${el.tag}>${textSnippet}${el.classes ? ` (classes: ${el.classes.slice(0, 80)})` : ''}`;
        })
        .join('\n');
      contextPrefix = `Regarding these selected elements on the page:\n${elementDescriptions}\n\n`;
    }

    const fullPrompt = contextPrefix + refinementPrompt;
    const visiblePrompt = refinementPrompt.trim() || 'Update the selected element(s).';
    const aiMessageId = makeMessageId();
    setRefinementMessages((prev) => [
      ...prev.filter((message) => message.id !== 'ready'),
      {
        id: makeMessageId(),
        role: 'user',
        text: visiblePrompt,
      },
      {
        id: aiMessageId,
        role: 'ai',
        text: 'Working on it...',
        status: 'thinking',
      },
    ]);
    setRefinementPrompt('');
    setPickedElements([]);
    setIsPickerActive(false);

    try {
      const responseMessage = await onRefine(fullPrompt);
      setRefinementMessages((prev) =>
        prev.map((message) =>
          message.id === aiMessageId
            ? {
                ...message,
                text: responseMessage || 'Refinement applied.',
                status: 'done',
              }
            : message
        )
      );
    } catch (err: any) {
      setRefinementMessages((prev) =>
        prev.map((message) =>
          message.id === aiMessageId
            ? {
                ...message,
                text: err?.message || 'Could not apply that refinement.',
                status: 'error',
              }
            : message
        )
      );
    }
  };

  // ── Build the HTML document with injected picker script ───────────────────
  const htmlDoc = buildSiteDocument(`
    ${sanitizedHtml}

    <style>
      .bs-picker-hover {
        outline: 2px solid #6366f1 !important;
        outline-offset: 2px !important;
        cursor: crosshair !important;
      }

      .bs-picker-hover::after {
        content: attr(data-bs-tag);
        position: fixed;
        bottom: 12px;
        left: 50%;
        transform: translateX(-50%);
        background: #6366f1;
        color: #fff;
        font-size: 11px;
        font-family: monospace;
        padding: 3px 10px;
        border-radius: 999px;
        pointer-events: none;
        z-index: 999999;
        white-space: nowrap;
      }
    </style>

    <script>
      (function() {
        var pickerEnabled = false;
        var lastHovered = null;

        function disablePicker() {
          pickerEnabled = false;
          document.body.style.cursor = '';
          if (lastHovered) {
            lastHovered.classList.remove('bs-picker-hover');
            lastHovered.removeAttribute('data-bs-tag');
            lastHovered = null;
          }
        }

        window.addEventListener('message', function(e) {
          if (!e.data || !e.data.type) return;
          if (e.data.type === 'ENABLE_PICKER') {
            pickerEnabled = true;
            document.body.style.cursor = 'crosshair';
          }
          if (e.data.type === 'DISABLE_PICKER') {
            disablePicker();
          }
        });

        document.addEventListener('mouseover', function(e) {
          if (!pickerEnabled) return;
          if (lastHovered && lastHovered !== e.target) {
            lastHovered.classList.remove('bs-picker-hover');
            lastHovered.removeAttribute('data-bs-tag');
          }
          lastHovered = e.target;
          e.target.setAttribute('data-bs-tag', '<' + e.target.tagName.toLowerCase() + '>');
          e.target.classList.add('bs-picker-hover');
        }, true);

        document.addEventListener('mouseout', function(e) {
          if (!pickerEnabled || !lastHovered) return;
          if (e.target === lastHovered) {
            lastHovered.classList.remove('bs-picker-hover');
            lastHovered.removeAttribute('data-bs-tag');
            lastHovered = null;
          }
        }, true);

        document.addEventListener('click', function(e) {
          if (!pickerEnabled) return;
          e.preventDefault();
          e.stopPropagation();
          var el = e.target;
          var outerHTML = el.outerHTML || '';
          if (outerHTML.length > 400) outerHTML = outerHTML.slice(0, 400) + '…';
          var text = (el.innerText || '').trim().slice(0, 200);
          window.parent.postMessage({
            type: 'ELEMENT_SELECTED',
            data: {
              tag: el.tagName.toLowerCase(),
              text: text,
              classes: el.className || '',
              id: el.id || '',
              outerHTML: outerHTML,
            }
          }, '*');

          el.style.transition = 'outline-color 0.15s';
          el.style.outline = '3px solid #4f46e5';
          setTimeout(function() {
            el.style.outline = '';
          }, 600);
        }, true);
      })();
    <\/script>
  `);

  return (
    <div className="h-screen w-full bg-white relative overflow-hidden">
      {/* Top Navigation / Controls */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md border border-gray-200 text-black px-4 py-2 rounded-full text-sm font-medium shadow-sm pointer-events-auto flex items-center">
          <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
          {isPaidProject ? 'Next.js Preview' : 'HTML Preview'}
        </div>
        <div className="flex items-center space-x-3 pointer-events-auto">
          {isPaidProject && (
            <button
              onClick={handleExportProject}
              disabled={isExporting}
              className="bg-white/90 backdrop-blur-md border border-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-medium hover:border-gray-400 hover:text-gray-900 transition-all shadow-sm disabled:opacity-60"
            >
              {isExporting ? 'Preparing zip...' : 'Export Next.js'}
            </button>
          )}
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="bg-white/90 backdrop-blur-md border border-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-medium hover:border-gray-400 hover:text-gray-900 transition-all shadow-sm flex items-center"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Refine
          </button>

          {/* Publish / Live button */}
          {isLive && liveUrl ? (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              onClick={handleCopyLink}
              className="flex items-center px-4 py-2 rounded-full text-sm font-medium bg-black text-white hover:bg-gray-800 transition-colors shadow-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white mr-2 animate-pulse" />
              {copied ? 'Copied!' : 'Live · Copy Link'}
            </motion.button>
          ) : (
            <button
              onClick={() => setIsPublishOpen(true)}
              className="flex items-center px-4 py-2 rounded-full bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
            >
              <Globe className="w-4 h-4 mr-2" />
              Publish
            </button>
          )}

          <button 
            onClick={onReset}
            className="bg-black text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
          >
            Edit Details
          </button>
        </div>
      </div>

      <div className={`w-full h-full transition-all duration-300 ${isSidebarOpen ? 'pr-[440px]' : ''}`}>
        <iframe 
          ref={iframeRef}
          srcDoc={htmlDoc}
          className="w-full h-full border-none"
          title="Generated Site"
          sandbox="allow-scripts"
        />
        {isPaidProject && (
          <div className="absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-full border border-indigo-100 bg-white/90 px-4 py-2 text-xs font-medium text-indigo-700 shadow-sm backdrop-blur-md">
            This in-app preview mirrors the deployable Next.js project included with your paid plan.
          </div>
        )}
        {/* Watermark — rendered outside the iframe so it can't be removed via HTML editing */}
        <Watermark pageId={content.id} slug={liveSlug} />
        {isRefining && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-40">
            <div className="bg-white px-6 py-4 rounded-2xl shadow-xl flex items-center space-x-3">
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
              <span className="font-medium text-gray-800">Refining your site...</span>
            </div>
          </div>
        )}
      </div>

      {/* Picker active overlay hint */}
      <AnimatePresence>
        {isPickerActive && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-full bg-indigo-600 text-white text-sm font-medium shadow-xl shadow-indigo-500/30 pointer-events-none"
          >
            <MousePointerClick className="w-4 h-4" />
            Click any element on the page to select it
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 bottom-0 w-[440px] bg-[#f8fafc] shadow-[-18px_0_45px_rgba(15,23,42,0.12)] border-l border-slate-200 z-50 flex flex-col"
          >
            <div className="border-b border-slate-200 bg-white">
              <div className="flex items-start justify-between p-5">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Editor online
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/20">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">Refine with AI</h3>
                      <p className="text-sm text-slate-500">Command center for live site edits</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                  aria-label="Close refine panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 border-t border-slate-100 text-center">
                <div className="px-4 py-3">
                  <div className="text-xs font-semibold text-slate-950">{content.generationMode === 'nextjs' ? 'Next.js' : 'HTML'}</div>
                  <div className="text-[11px] text-slate-400">Mode</div>
                </div>
                <div className="border-x border-slate-100 px-4 py-3">
                  <div className="text-xs font-semibold text-slate-950">{pickedElements.length}</div>
                  <div className="text-[11px] text-slate-400">Selected</div>
                </div>
                <div className="px-4 py-3">
                  <div className="text-xs font-semibold text-slate-950">{isRefining ? 'Working' : 'Ready'}</div>
                  <div className="text-[11px] text-slate-400">Status</div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-4">
                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                        <MousePointer2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-950">Target edits</p>
                        <p className="text-xs text-slate-500">Pick preview elements for precision</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsPickerActive((p) => !p)}
                      className={`inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs font-semibold transition-all ${
                        isPickerActive
                          ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/25'
                          : 'border border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:text-cyan-700'
                      }`}
                    >
                      {isPickerActive ? 'Picking' : 'Pick'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {quickActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.label}
                          onClick={() => setRefinementPrompt(action.prompt)}
                          className="flex min-h-16 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-950"
                        >
                          <Icon className="h-4 w-4 flex-shrink-0 text-slate-500" />
                          <span>{action.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <AnimatePresence initial={false}>
                  {pickedElements.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Selected elements</p>
                        <button
                          onClick={() => setPickedElements([])}
                          className="text-[11px] font-medium text-slate-400 transition-colors hover:text-red-500"
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="flex flex-col gap-2">
                        <AnimatePresence initial={false}>
                          {pickedElements.map((el) => (
                            <motion.div
                              key={el.id}
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10, height: 0, marginBottom: 0 }}
                              transition={{ duration: 0.18 }}
                              className="group flex items-start gap-2 rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2.5"
                            >
                              <div className="flex-1 min-w-0">
                                <span className="mb-1 inline-block rounded bg-white px-1.5 py-0.5 font-mono text-[10px] text-cyan-700">
                                  &lt;{el.tag}&gt;
                                </span>
                                {el.text && (
                                  <p className="truncate text-xs leading-relaxed text-cyan-950">
                                    "{el.text}"
                                  </p>
                                )}
                                {!el.text && el.classes && (
                                  <p className="truncate font-mono text-[10px] text-cyan-600">
                                    .{el.classes.trim().split(' ')[0]}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => removePicked(el.id)}
                                className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-cyan-300 opacity-0 transition-all hover:bg-cyan-100 hover:text-cyan-700 group-hover:opacity-100"
                                aria-label="Remove selected element"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers3 className="h-4 w-4 text-amber-600" />
                      <p className="text-sm font-semibold text-slate-950">Edit briefing</p>
                    </div>
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                      Live preview
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Design, copy, layout, and sections can be edited.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquareText className="h-4 w-4 text-slate-500" />
                      <span>AI replies here after each refinement.</span>
                    </div>
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-slate-700" />
                      <p className="text-sm font-semibold text-slate-950">Activity</p>
                    </div>
                    <Clock3 className="h-4 w-4 text-slate-300" />
                  </div>
                  <div className="space-y-3">
                    {refinementMessages.slice(-5).map((message) => (
                      <div
                        key={message.id}
                        className={`rounded-lg px-3 py-2.5 text-sm leading-relaxed ${
                          message.role === 'user'
                            ? 'ml-7 bg-slate-950 text-white'
                            : message.status === 'error'
                              ? 'mr-7 border border-red-100 bg-red-50 text-red-700'
                              : 'mr-7 border border-slate-200 bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-70">
                          {message.role === 'ai' && message.status === 'thinking' ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : message.role === 'ai' ? (
                            <Bot className="h-3 w-3" />
                          ) : (
                            <MessageSquareText className="h-3 w-3" />
                          )}
                          {message.role === 'ai' ? 'AI' : 'You'}
                        </div>
                        {message.text}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-white p-5">
              {error && (
                <div className="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-xs font-medium leading-relaxed text-red-600">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="relative">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Wand2 className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-xs font-semibold text-slate-700">Command</span>
                  </div>
                  {pickedElements.length > 0 && (
                    <div className="flex items-center gap-1.5 rounded-full bg-cyan-50 px-2 py-1">
                      <MousePointerClick className="h-3 w-3 text-cyan-600" />
                      <span className="text-[11px] font-medium text-cyan-700">
                        {pickedElements.length} selected
                      </span>
                    </div>
                  )}
                </div>
                <textarea
                  value={refinementPrompt}
                  onChange={(e) => setRefinementPrompt(e.target.value)}
                  placeholder={pickedElements.length > 0 ? "Tell AI what to do with the selected element(s)" : "Describe the edit you want"}
                  className="min-h-24 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 py-3 pl-4 pr-12 text-sm text-slate-950 outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={(!refinementPrompt.trim() && pickedElements.length === 0) || isRefining}
                  className="absolute bottom-3 right-3 rounded-lg bg-slate-950 p-2 text-white transition-colors hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-950"
                  aria-label="Send refinement command"
                >
                  {isRefining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Publish Modal */}
      {isPublishOpen && content.id && (
        <PublishModal
          pageId={content.id}
          existingSlug={liveSlug}
          existingPublishedAt={content.published_at}
          onClose={() => setIsPublishOpen(false)}
          onPublished={handlePublished}
        />
      )}
    </div>
  );
}
