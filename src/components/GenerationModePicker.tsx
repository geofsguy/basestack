import { Code2, Layers3, Lock, Rocket, ServerCog, Sparkles } from 'lucide-react';
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
    title: 'HTML/CSS',
    eyebrow: 'Fastest path',
    summary: 'Great for a polished personal site that is simple to host and easy to ship.',
    strengths: [
      'Works on every plan',
      'Simpler static-style hosting',
      'Faster to launch and maintain',
    ],
    tradeoffs: [
      'Less flexible for larger app-like experiences',
      'No exported React/Next.js project files',
      'Best when you want a clean finished site, not a dev stack',
    ],
  },
  {
    mode: 'nextjs',
    title: 'Next.js',
    eyebrow: 'More powerful build',
    summary: 'Best when you want a richer React/Tailwind project you can keep developing after generation.',
    strengths: [
      'Deployable Next.js + React + Tailwind project',
      'Better for iterative product-style builds',
      'Great if you want exported source files',
    ],
    tradeoffs: [
      'Needs a server or modern app hosting setup',
      'More moving parts than plain HTML/CSS',
      'Locked to paid plans',
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
    <div className="min-h-screen bg-[#fcfcfc] px-6 py-10 font-sans relative overflow-hidden">
      <div
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_1.2fr]">
          <div className="rounded-[2rem] border border-gray-100 bg-white/90 p-8 shadow-[0_16px_60px_rgba(0,0,0,0.05)] backdrop-blur">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
              <Sparkles className="h-3.5 w-3.5" />
              Build Format
            </div>

            <h1 className="max-w-md text-4xl font-medium tracking-tight text-gray-950">
              Choose how you want BaseStack to generate your site.
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-gray-500">
              Both options can look great. The real difference is how much flexibility and hosting setup you want after generation.
            </p>

            <div className="mt-8 space-y-4 rounded-[1.75rem] border border-gray-100 bg-gray-50/80 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white shadow-lg shadow-black/10">
                  <ServerCog className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Your current plan</p>
                  <p className="text-sm text-gray-500">
                    {currentTier === 'free' ? 'Free' : currentTier === 'studio' ? 'Studio' : 'Pro'}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-gray-500">
                {isPaid ? (
                  <>You can choose either format. Pick HTML/CSS for a simpler site, or Next.js if you want the richer exported project.</>
                ) : (
                  <>
                    You can generate with HTML/CSS right now. Next.js is shown here for transparency, but it stays locked until you upgrade.
                    {' '}
                    <Link to="/settings" className="font-medium text-gray-900 underline underline-offset-4">
                      View plans
                    </Link>
                    .
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {OPTIONS.map((option) => {
              const isLocked = option.mode === 'nextjs' && !isPaid;
              const isSelected = selectedMode === option.mode;

              return (
                <button
                  key={option.mode}
                  type="button"
                  onClick={() => {
                    if (!isLocked) onSelect(option.mode);
                  }}
                  className={`group relative w-full overflow-hidden rounded-[2rem] border bg-white p-6 text-left shadow-sm transition-all ${
                    isSelected
                      ? 'border-black shadow-[0_18px_55px_rgba(0,0,0,0.08)]'
                      : isLocked
                        ? 'border-gray-200 opacity-90'
                        : 'border-gray-100 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-lg'
                  }`}
                >
                  <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-gray-900 via-gray-600 to-gray-300 opacity-90" />

                  <div className="flex flex-wrap items-start justify-between gap-4 pt-3">
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                        option.mode === 'nextjs' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-900'
                      }`}>
                        {option.mode === 'nextjs' ? <Layers3 className="h-5 w-5" /> : <Code2 className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                          {option.eyebrow}
                        </p>
                        <h2 className="mt-1 text-2xl font-medium tracking-tight text-gray-950">{option.title}</h2>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">{option.summary}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isLocked && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                          <Lock className="h-3.5 w-3.5" />
                          Paid plans
                        </span>
                      )}
                      {isSelected && !isLocked && (
                        <span className="rounded-full border border-black bg-black px-3 py-1 text-xs font-semibold text-white">
                          Selected
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-[1.5rem] bg-gray-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Upsides</p>
                      <div className="mt-3 space-y-2">
                        {option.strengths.map((item) => (
                          <p key={item} className="text-sm leading-6 text-gray-700">
                            {item}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] bg-gray-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Tradeoffs</p>
                      <div className="mt-3 space-y-2">
                        {option.tradeoffs.map((item) => (
                          <p key={item} className="text-sm leading-6 text-gray-700">
                            {item}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            <div className="flex flex-col items-start justify-between gap-4 rounded-[2rem] border border-gray-100 bg-white px-6 py-5 shadow-sm sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {selectedMode === 'nextjs' ? 'Next.js project selected' : 'HTML/CSS selected'}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedMode === 'nextjs'
                    ? 'You will get a richer project structure plus the in-app preview.'
                    : 'You will get a polished HTML site that is simpler to host and manage.'}
                </p>
              </div>

              <button
                type="button"
                onClick={onContinue}
                className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition-all hover:bg-gray-800"
              >
                Continue with {selectedMode === 'nextjs' ? 'Next.js' : 'HTML/CSS'}
                <Rocket className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
