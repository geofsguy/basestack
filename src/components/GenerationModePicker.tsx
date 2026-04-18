import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  icon: React.ElementType;
  glowColor: string;
}> = [
  {
    mode: 'html',
    title: 'HTML & CSS',
    eyebrow: 'Fastest Path',
    summary: 'A pristine, statically built site. Ideal for landing pages, simple portfolios, and pure speed.',
    strengths: [
      'Included in all plans automatically',
      'Ultra-fast, zero-config static hosting',
      'Extremely simple to launch & maintain',
    ],
    tradeoffs: [
      'Not suited for dynamic, app-like logic',
      'Doesn\'t export reusable React components',
    ],
    icon: Code2,
    glowColor: 'rgba(56, 189, 248, 0.4)', // Light blue
  },
  {
    mode: 'nextjs',
    title: 'Next.js App',
    eyebrow: 'Powerful Build',
    summary: 'A full-scale React project engineered for feature-rich, scalable development and true interactivity.',
    strengths: [
      'Complete Next.js + Tailwind infrastructure',
      'Perfect foundation for complex web apps',
      'Export pure source files for developers',
    ],
    tradeoffs: [
      'Requires modern Node.js app hosting',
      'Exclusive to Premium tiers',
    ],
    icon: Layers3,
    glowColor: 'rgba(167, 139, 250, 0.4)', // Violet
  },
];

export default function GenerationModePicker({
  currentTier,
  selectedMode,
  onSelect,
  onContinue,
}: GenerationModePickerProps) {
  const isPaid = currentTier === 'pro' || currentTier === 'studio';
  const [hoveredMode, setHoveredMode] = useState<SiteGenerationMode | null>(null);

  return (
    <div className="min-h-[100dvh] bg-[#030014] flex flex-col font-sans relative overflow-x-hidden selection:bg-indigo-500/30 selection:text-white pb-10">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/30 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-fuchsia-600/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute top-[20%] right-[20%] w-[300px] h-[300px] bg-sky-500/20 blur-[120px] rounded-full mix-blend-screen" />
        
        {/* Subtle noise pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
          }}
        />
        
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_20%,transparent_100%)] opacity-50" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-24 lg:pt-32 flex-1 flex flex-col justify-center">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center mb-16 max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)] backdrop-blur-md mb-8">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px] font-bold tracking-[0.2em] text-indigo-100 uppercase">
              Build Architecture
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/50 mb-6 drop-shadow-sm">
            Choose your foundation
          </h1>
          <p className="text-lg md:text-xl text-white/60 leading-relaxed font-light max-w-2xl mx-auto">
            Both engines compile to a stunning final product. The difference lies in how you plan to host, scale, and iterate on your code.
          </p>
        </motion.div>

        {/* Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 mb-16 relative">
          {OPTIONS.map((option, idx) => {
            const isLocked = option.mode === 'nextjs' && !isPaid;
            const isSelected = selectedMode === option.mode;
            const isHovered = hoveredMode === option.mode;

            return (
              <motion.button
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 + idx * 0.1, ease: 'easeOut' }}
                key={option.mode}
                type="button"
                onMouseEnter={() => setHoveredMode(option.mode)}
                onMouseLeave={() => setHoveredMode(null)}
                onClick={() => !isLocked && onSelect(option.mode)}
                className={`group relative text-left rounded-[2.5rem] p-8 md:p-10 transition-all duration-500 ease-out flex flex-col focus:outline-none overflow-hidden ${
                  isSelected
                    ? 'bg-white/10 border border-white/20 shadow-[0_0_50px_-10px_rgba(255,255,255,0.1)] scale-[1.02]'
                    : isLocked
                      ? 'bg-white/[0.02] border border-white/5 opacity-80 cursor-not-allowed'
                      : 'bg-white/[0.05] border border-white/10 hover:bg-white/[0.08] hover:-translate-y-2 hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.5)]'
                }`}
              >
                {/* Glassmorphic internal glow based on selection/hover */}
                <div 
                  className={`absolute inset-0 opacity-0 transition-opacity duration-700 pointer-events-none rounded-[2.5rem] ${
                    isSelected ? 'opacity-100' : isHovered && !isLocked ? 'opacity-40' : ''
                  }`}
                  style={{
                    background: `radial-gradient(120% 120% at 50% -20%, ${option.glowColor}, transparent)`,
                  }}
                />

                {/* Card Header */}
                <div className="relative z-10 flex justify-between items-start mb-8 w-full">
                  <div
                    className={`p-4 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-xl ${
                      isSelected
                        ? 'bg-white text-indigo-950 shadow-white/20'
                        : isLocked
                          ? 'bg-white/5 text-white/30 border border-white/10'
                          : 'bg-white/10 text-white border border-white/10 group-hover:bg-white/20'
                    }`}
                  >
                    <option.icon className="w-7 h-7" />
                  </div>

                  <div className="flex items-center gap-2">
                    {isLocked && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 text-[11px] font-bold tracking-widest text-white/50 uppercase backdrop-blur-md">
                        <Lock className="w-3.5 h-3.5" />
                        Premium
                      </span>
                    )}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.span 
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-full text-[11px] font-bold tracking-widest text-white shadow-lg uppercase"
                        >
                          Selected
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Card Intro Text */}
                <div className="relative z-10">
                  <div className="text-[11px] font-black tracking-[0.25em] text-white/40 uppercase mb-3">
                    {option.eyebrow}
                  </div>
                  <h2 className="text-3xl font-semibold tracking-tight text-white mb-4 drop-shadow-md">
                    {option.title}
                  </h2>
                  <p className="text-[15px] text-white/60 leading-relaxed font-light min-h-[66px]">
                    {option.summary}
                  </p>
                </div>

                {/* Card Feature Lists */}
                <div className="relative z-10 mt-8 pt-8 space-y-8 border-t border-white/10">
                  <div>
                    <h3 className="text-[11px] font-black tracking-[0.2em] text-white flex items-center gap-2.5 uppercase mb-5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Benefits
                    </h3>
                    <ul className="space-y-4">
                      {option.strengths.map((s) => (
                        <li key={s} className="flex items-start gap-4">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 mt-2.5 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                          <span className="text-[14px] text-white/80 leading-relaxed font-light">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-[11px] font-black tracking-[0.2em] text-white/50 flex items-center gap-2.5 uppercase mb-5">
                      <X className="w-4 h-4 text-rose-400/50" />
                      Tradeoffs
                    </h3>
                    <ul className="space-y-4">
                      {option.tradeoffs.map((t) => (
                        <li key={t} className="flex items-start gap-4">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-400/40 mt-2.5 shrink-0 shadow-[0_0_8px_rgba(251,113,133,0.3)]" />
                          <span className="text-[14px] text-white/50 leading-relaxed font-light">{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Bottom Action Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
          className="mt-auto w-full max-w-4xl mx-auto mb-4"
        >
          <div className="bg-white/[0.03] backdrop-blur-3xl rounded-[2rem] p-6 shadow-2xl border border-white/10 flex flex-col sm:flex-row items-center gap-6 justify-between transition-all">
            <div className="flex items-center gap-5 px-2 w-full sm:w-auto">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 shadow-inner">
                <ServerCog className="w-6 h-6 text-indigo-400/80" />
              </div>
              <div>
                <div className="text-[16px] font-medium text-white flex items-center gap-3">
                  Current Tier
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest leading-none flex items-center h-[24px] ${
                    isPaid ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-white/10 text-white/60 border border-white/10'
                  }`}>
                    {currentTier}
                  </span>
                </div>
                <div className="text-[14px] text-white/50 mt-1">
                  {isPaid ? (
                    'You have full access to all formats.'
                  ) : (
                    <span className="flex items-center gap-1 font-light">
                      HTML is ready.
                      <Link to="/settings" className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors ml-1 border-b border-indigo-400/30 hover:border-indigo-300">
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
              className="w-full sm:w-auto relative group overflow-hidden rounded-2xl bg-white text-black px-10 py-4 text-[16px] font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.3)] flex items-center justify-center gap-3"
            >
              <span className="relative z-10 flex items-center gap-2">
                Continue with {selectedMode === 'nextjs' ? 'Next.js' : 'HTML'}
                <Rocket className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform ease-out duration-300" />
              </span>
              <div className="absolute inset-0 z-0 bg-gradient-to-r from-white via-indigo-100 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
