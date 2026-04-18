import { Code2, Layers3, Lock, Rocket, ServerCog, Sparkles, CheckCircle2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SiteGenerationMode } from '../types';

type SubscriptionTier = 'free' | 'pro' | 'studio';

interface GenerationModePickerProps {
  currentTier: SubscriptionTier;
  selectedMode: SiteGenerationMode;
  onSelect: (mode: SiteGenerationMode) => void;
  onContinue: () => void;
}

const OPTIONS: Array<{
  mode: SiteGenerationMode;
  title: string;
  eyebrow: string;
  summary: string;
  strengths: string[];
  tradeoffs: string[];
}> = [
  {
    mode: 'html',
    title: 'HTML & CSS',
    eyebrow: 'Fastest Path',
    summary: 'A pristine, statically built site. Ideal for landing pages, simple portfolios, and purely focusing on content.',
    strengths: [
      'Included in all plans automatically',
      'Ultra-fast, zero-config static hosting',
      'Extremely simple to launch & maintain',
    ],
    tradeoffs: [
      'Not suited for dynamic, app-like logic',
      'Doesn\'t export reusable React components',
    ],
  },
  {
    mode: 'nextjs',
    title: 'Next.js App',
    eyebrow: 'Powerful Build',
    summary: 'A full-scale React and Tailwind project engineered for feature-rich, scalable development and interactivity.',
    strengths: [
      'Complete Next.js + Tailwind infrastructure',
      'Perfect foundation for complex web apps',
      'Export pure source files for developers',
    ],
    tradeoffs: [
      'Requires modern Node.js app hosting',
      'Exclusive to Premium tiers',
    ],
  },
];

export default function GenerationModePicker({
  currentTier,
  selectedMode,
  onSelect,
  onContinue,
}: GenerationModePickerProps) {
  const isPaid = currentTier === 'pro' || currentTier === 'studio';

  return (
    <div className="min-h-[100dvh] bg-[#fafafa] flex flex-col font-sans relative overflow-x-hidden selection:bg-black selection:text-white pb-10">
      {/* Refined Minimalist Grid Background */}
      <div className="absolute inset-0 pointer-events-none z-0 bg-[linear-gradient(to_right,#e5e5e5_1px,transparent_1px),linear-gradient(to_bottom,#e5e5e5_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.4]" />
      <div className="absolute top-0 inset-x-0 h-[500px] pointer-events-none z-0 bg-gradient-to-b from-white/80 via-white/40 to-transparent" />

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-24 flex-1 flex flex-col">
        {/* Header Section */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white ring-1 ring-inset ring-neutral-200/80 shadow-sm mb-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <Sparkles className="w-3.5 h-3.5 text-neutral-500" />
            <span className="text-[11px] font-bold tracking-[0.2em] text-neutral-600 uppercase">
              Build Architecture
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-neutral-950 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both">
            Choose your foundation
          </h1>
          <p className="text-lg text-neutral-500 leading-relaxed font-light animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both [text-wrap:balance]">
            Both engines compile to a stunning final product. The difference lies in how you plan to host, scale, and iterate on your code after it's generated.
          </p>
        </div>

        {/* Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 mb-16 relative animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
          {OPTIONS.map((option) => {
            const isLocked = option.mode === 'nextjs' && !isPaid;
            const isSelected = selectedMode === option.mode;

            return (
              <button
                key={option.mode}
                type="button"
                onClick={() => !isLocked && onSelect(option.mode)}
                className={`group relative text-left rounded-[2rem] p-8 md:p-10 transition-all duration-500 ease-out flex flex-col focus:outline-none ${
                  isSelected
                    ? 'bg-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.12)] ring-2 ring-inset ring-black scale-[1.02]'
                    : isLocked
                      ? 'bg-neutral-50/50 ring-1 ring-inset ring-neutral-200 opacity-[0.85] cursor-not-allowed'
                      : 'bg-white ring-1 ring-inset ring-neutral-200/80 shadow-sm hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:ring-neutral-300'
                }`}
              >
                {/* Card Header */}
                <div className="flex justify-between items-start mb-8 w-full">
                  <div
                    className={`p-4 rounded-2xl flex items-center justify-center transition-colors duration-300 ${
                      isSelected
                        ? 'bg-black text-white shadow-md shadow-black/20'
                        : isLocked
                          ? 'bg-neutral-200/60 text-neutral-400'
                          : 'bg-neutral-100 text-neutral-700 group-hover:bg-neutral-200 group-hover:text-black'
                    }`}
                  >
                    {option.mode === 'nextjs' ? <Layers3 className="w-6 h-6" /> : <Code2 className="w-6 h-6" />}
                  </div>

                  <div className="flex items-center gap-2">
                    {isLocked && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 ring-1 ring-inset ring-neutral-200 text-[11px] font-bold tracking-wide text-neutral-500 uppercase">
                        <Lock className="w-3 h-3" />
                        Premium Only
                      </span>
                    )}
                    {isSelected && (
                      <span className="inline-flex px-3 py-1 bg-black rounded-full text-[11px] font-bold tracking-wide text-white shadow-sm uppercase animate-in fade-in zoom-in duration-300">
                        Selected
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Intro Text */}
                <div>
                  <div className="text-[11px] font-bold tracking-[0.2em] text-neutral-400 uppercase mb-2.5">
                    {option.eyebrow}
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 mb-3">
                    {option.title}
                  </h2>
                  <p className="text-[15px] text-neutral-500 leading-relaxed font-light min-h-[44px]">
                    {option.summary}
                  </p>
                </div>

                {/* Card Feature Lists */}
                <div className="mt-8 pt-8 space-y-8 border-t border-neutral-100/80">
                  <div>
                    <h3 className="text-[11px] font-bold tracking-[0.2em] text-neutral-900 uppercase mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                      Benefits
                    </h3>
                    <ul className="space-y-3.5">
                      {option.strengths.map((s) => (
                        <li key={s} className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 mt-2 shrink-0" />
                          <span className="text-[14px] text-neutral-600 leading-relaxed font-light">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-[11px] font-bold tracking-[0.2em] text-neutral-400 uppercase mb-4 flex items-center gap-2">
                      <X className="w-3.5 h-3.5 text-neutral-400" />
                      Tradeoffs
                    </h3>
                    <ul className="space-y-3.5">
                      {option.tradeoffs.map((t) => (
                        <li key={t} className="flex items-start gap-3 opacity-80">
                          <div className="w-1.5 h-1.5 rounded-full bg-neutral-200 mt-2 shrink-0" />
                          <span className="text-[14px] text-neutral-500 leading-relaxed font-light">{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom Action Bar */}
        <div className="mt-auto w-full max-w-4xl mx-auto mb-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500 fill-mode-both">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 shadow-[0_8px_40px_-5px_rgba(0,0,0,0.06)] ring-1 ring-inset ring-neutral-200/80 flex flex-col sm:flex-row items-center gap-6 justify-between transition-all">
            <div className="flex items-center gap-4 px-2 w-full sm:w-auto">
              <div className="w-12 h-12 rounded-full bg-neutral-100/80 flex items-center justify-center shrink-0">
                <ServerCog className="w-5 h-5 text-neutral-600" />
              </div>
              <div>
                <div className="text-[15px] font-medium text-neutral-900 flex items-center gap-2">
                  Plan details
                  <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 border border-neutral-200 text-[10px] font-bold uppercase tracking-widest leading-none flex items-center h-[22px]">
                    {currentTier}
                  </span>
                </div>
                <div className="text-[13px] text-neutral-500 mt-0.5">
                  {isPaid ? (
                    'You have full access to all formats.'
                  ) : (
                    <span className="flex items-center gap-1 font-light">
                      HTML is ready.
                      <Link to="/settings" className="font-medium text-black underline underline-offset-2 hover:text-neutral-600 transition-colors">
                        Upgrade for Next.js.
                      </Link>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onContinue}
              className="w-full sm:w-auto relative group overflow-hidden rounded-[1.25rem] bg-black px-8 py-4 text-[15px] font-medium text-white transition-all hover:scale-105 active:scale-95 shadow-xl shadow-black/10 flex items-center justify-center gap-2"
            >
              <span className="relative z-10 flex items-center gap-2">
                Continue with {selectedMode === 'nextjs' ? 'Next.js' : 'HTML'}
                <Rocket className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform ease-out duration-300" />
              </span>
              <div className="absolute inset-0 z-0 bg-gradient-to-r from-neutral-800 to-black opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
