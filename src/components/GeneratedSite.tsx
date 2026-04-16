import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wand2, X, Send, Loader2, Globe, MousePointer2, MousePointerClick } from 'lucide-react';
import { SiteContent } from '../types';
import PublishModal from './PublishModal';
import Watermark from './Watermark';
import { buildSiteDocument } from '../services/siteDocument';
import { sanitizeGeneratedHtml } from '../services/htmlSanitizer';

interface GeneratedSiteProps {
  content: SiteContent & { id?: string; slug?: string | null; published_at?: string | null };
  onReset: () => void;
  onRefine: (prompt: string) => void;
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

export default function GeneratedSite({ content, onReset, onRefine, isRefining, error }: GeneratedSiteProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [liveSlug, setLiveSlug] = useState<string | null>(content.slug || null);
  const [isLive, setIsLive] = useState(!!content.published_at);
  const [copied, setCopied] = useState(false);
  const [isPickerActive, setIsPickerActive] = useState(false);
  const [pickedElements, setPickedElements] = useState<PickedElement[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const sanitizedHtml = sanitizeGeneratedHtml(content.html);

  const liveUrl = liveSlug ? `${window.location.origin}/s/${liveSlug}` : null;

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

  const removePicked = (id: string) => {
    setPickedElements((prev) => prev.filter((el) => el.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
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
    onRefine(fullPrompt);
    setRefinementPrompt('');
    setPickedElements([]);
    setIsPickerActive(false);
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
          Preview Mode
        </div>
        <div className="flex items-center space-x-3 pointer-events-auto">
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

      <div className={`w-full h-full transition-all duration-300 ${isSidebarOpen ? 'pr-[420px]' : ''}`}>
        <iframe 
          ref={iframeRef}
          srcDoc={htmlDoc}
          className="w-full h-full border-none"
          title="Generated Site"
          sandbox="allow-scripts"
        />
        {/* Watermark — rendered outside the iframe so it can't be removed via HTML editing */}
        <Watermark />
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
            className="absolute top-0 right-0 bottom-0 w-[420px] bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.05)] border-l border-gray-100 z-50 flex flex-col"
          >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center space-x-2 text-indigo-600">
                <Wand2 className="w-5 h-5" />
                <h3 className="font-semibold text-gray-900">Refine with AI</h3>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pick Element Toggle */}
            <div className="px-6 pt-5 pb-3">
              <button
                onClick={() => setIsPickerActive((p) => !p)}
                className={`w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
                  isPickerActive
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                <MousePointer2 className="w-4 h-4" />
                {isPickerActive ? 'Picking — click an element…' : 'Pick Element'}
                {pickedElements.length > 0 && !isPickerActive && (
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-semibold">
                    {pickedElements.length}
                  </span>
                )}
              </button>
              {!isPickerActive && (
                <p className="text-[11px] text-gray-400 text-center mt-2 leading-relaxed">
                  Select elements on the preview to give the AI precise context
                </p>
              )}
            </div>

            <div className="flex-1 p-6 pt-2 overflow-y-auto">
              <div className="space-y-5">
                {/* Picked Element Chips */}
                <AnimatePresence initial={false}>
                  {pickedElements.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Selected Elements
                        </p>
                        <button
                          onClick={() => setPickedElements([])}
                          className="text-[11px] text-gray-400 hover:text-red-500 transition-colors"
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
                              className="flex items-start gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2.5 group"
                            >
                              <div className="flex-1 min-w-0">
                                <span className="inline-block font-mono text-[10px] bg-indigo-100 text-indigo-700 rounded px-1.5 py-0.5 mb-1">
                                  &lt;{el.tag}&gt;
                                </span>
                                {el.text && (
                                  <p className="text-xs text-indigo-800 leading-relaxed truncate">
                                    "{el.text}"
                                  </p>
                                )}
                                {!el.text && el.classes && (
                                  <p className="text-[10px] text-indigo-500 font-mono truncate">
                                    .{el.classes.trim().split(' ')[0]}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => removePicked(el.id)}
                                className="w-5 h-5 flex items-center justify-center rounded-full text-indigo-300 hover:text-indigo-600 hover:bg-indigo-100 transition-all flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100"
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

                {/* Instructions hint */}
                <div className="bg-indigo-50 text-indigo-800 p-4 rounded-xl text-sm leading-relaxed">
                  Tell me what you'd like to change! I can update the design, change colors, rewrite copy, or add entirely new sections.
                </div>
                
                {/* Example prompts */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Examples</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setRefinementPrompt("Make the fonts more elegant and cursive")} className="text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors text-left">
                      "Make the fonts more elegant"
                    </button>
                    <button onClick={() => setRefinementPrompt("Change the color theme to dark mode")} className="text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors text-left">
                      "Change to dark mode"
                    </button>
                    <button onClick={() => setRefinementPrompt("Add a functional contact form section at the bottom")} className="text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors text-left">
                      "Add a contact form"
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-gray-100 bg-gray-50">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-medium leading-relaxed">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="relative">
                {/* Context badge */}
                {pickedElements.length > 0 && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <MousePointerClick className="w-3 h-3 text-indigo-500" />
                    <span className="text-[11px] text-indigo-600 font-medium">
                      {pickedElements.length} element{pickedElements.length !== 1 ? 's' : ''} selected as context
                    </span>
                  </div>
                )}
                <textarea
                  value={refinementPrompt}
                  onChange={(e) => setRefinementPrompt(e.target.value)}
                  placeholder={pickedElements.length > 0 ? "What should I do with the selected element(s)?" : "Ask for changes..."}
                  className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none bg-white"
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={(!refinementPrompt.trim() && pickedElements.length === 0) || isRefining}
                  className="absolute bottom-3 right-3 text-white bg-indigo-600 hover:bg-indigo-700 p-2 rounded-lg disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                >
                  <Send className="w-4 h-4" />
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
