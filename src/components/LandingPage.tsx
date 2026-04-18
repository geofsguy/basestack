import React, { useEffect, useRef } from 'react';
import { motion, useAnimationFrame, useMotionValue, useTransform } from 'motion/react';
import {
  Sparkles, ArrowRight, Code2, Palette, Zap, Wand2, Globe, CheckCircle2,
  MousePointer2, Layers, Share2, Star
} from 'lucide-react';
import Logo from './Logo';

/* ─── Animated Mesh Gradient ─────────────────────────────── */
function MeshGradient() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base */}
      <div className="absolute inset-0 bg-[#f5f3ff]" />
      {/* Blobs */}
      <motion.div
        className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)' }}
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-20 -right-40 w-[700px] h-[700px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.14) 0%, transparent 70%)' }}
        animate={{ x: [0, -50, 0], y: [0, 40, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      <motion.div
        className="absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.10) 0%, transparent 70%)' }}
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />
      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
          backgroundRepeat: 'repeat',
          backgroundSize: '128px'
        }}
      />
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,0,0,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }}
      />
    </div>
  );
}

/* ─── Floating Badge ─────────────────────────────────────── */
function FloatingBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={`absolute hidden lg:flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-white/80 rounded-2xl px-4 py-2.5 shadow-lg shadow-black/5 text-sm font-medium ${className}`}
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Browser Mockup ─────────────────────────────────────── */
function BrowserMockup() {
  return (
    <div className="rounded-2xl border border-white/60 bg-white shadow-2xl shadow-violet-500/10 overflow-hidden">
      {/* Chrome bar */}
      <div className="h-11 bg-gray-50 border-b border-gray-100 flex items-center px-4 gap-3">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
        </div>
        <div className="flex-1 bg-gray-100 rounded-md h-6 flex items-center px-3">
          <span className="text-gray-400 text-xs">alexchen.site</span>
        </div>
      </div>

      {/* Page content */}
      <div className="relative bg-gradient-to-br from-violet-50 to-blue-50 p-8 min-h-[340px]">
        {/* Nav */}
        <div className="flex justify-between items-center mb-10">
          <div className="w-16 h-3 rounded-full bg-gray-800" />
          <div className="flex gap-4">
            <div className="w-10 h-2.5 rounded-full bg-gray-300" />
            <div className="w-10 h-2.5 rounded-full bg-gray-300" />
            <div className="w-14 h-5 rounded-full bg-violet-600" />
          </div>
        </div>

        {/* Hero text */}
        <motion.div
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-3/4 h-6 rounded-lg bg-gray-900 mb-3" />
          <div className="w-1/2 h-4 rounded-lg bg-gray-600 mb-2" />
          <div className="w-2/3 h-4 rounded-lg bg-gray-400 mb-8" />
        </motion.div>

        {/* Cards row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { bg: 'bg-violet-100', accent: 'bg-violet-500' },
            { bg: 'bg-blue-100', accent: 'bg-blue-500' },
            { bg: 'bg-emerald-100', accent: 'bg-emerald-500' },
          ].map((c, i) => (
            <motion.div
              key={i}
              className={`${c.bg} rounded-xl p-3`}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 5 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.8 }}
            >
              <div className={`w-6 h-6 rounded-lg ${c.accent} mb-2`} />
              <div className="w-full h-2 rounded bg-white/80 mb-1.5" />
              <div className="w-3/4 h-2 rounded bg-white/60" />
            </motion.div>
          ))}
        </div>

        {/* Typing cursor effect */}
        <motion.div
          className="w-0.5 h-4 bg-violet-600 absolute bottom-8 right-8"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      </div>
    </div>
  );
}

/* ─── Bento Feature Card ─────────────────────────────────── */
interface BentoCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
  className?: string;
  children?: React.ReactNode;
}

function BentoCard({ icon, title, description, accent, className = '', children }: BentoCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`relative rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-black/5 transition-shadow overflow-hidden p-8 flex flex-col ${className}`}
    >
      {/* Accent glow */}
      <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10 blur-2xl ${accent}`} />
      <div className={`w-12 h-12 rounded-2xl ${accent} flex items-center justify-center mb-6 text-white`}>
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-500 leading-relaxed text-sm flex-1">{description}</p>
      {children && <div className="mt-6">{children}</div>}
    </motion.div>
  );
}

/* ─── Step Card ──────────────────────────────────────────── */
function StepCard({ num, icon, title, desc, active }: { num: string; icon: React.ReactNode; title: string; desc: string; active?: boolean }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={`relative flex flex-col items-center text-center p-8 rounded-3xl border transition-all
        ${active
          ? 'bg-gray-950 border-gray-800 shadow-2xl shadow-black/20 text-white'
          : 'bg-white border-gray-100 shadow-sm'
        }`}
    >
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-2xl font-bold
        ${active ? 'bg-white/10 text-white' : 'bg-gray-50 text-gray-900'}`}>
        {icon || num}
      </div>
      <h3 className={`text-xl font-semibold mb-3 ${active ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
      <p className={`text-sm leading-relaxed ${active ? 'text-gray-400' : 'text-gray-500'}`}>{desc}</p>
      {active && (
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-violet-600/10 rounded-full blur-3xl" />
        </div>
      )}
    </motion.div>
  );
}

/* ─── Testimonial ────────────────────────────────────────── */
function Testimonial({ quote, name, title, avatar }: { quote: string; name: string; title: string; avatar: string }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 flex flex-col gap-6"
    >
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-gray-700 text-sm leading-relaxed flex-1">"{quote}"</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
          {avatar}
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{name}</p>
          <p className="text-gray-400 text-xs">{title}</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function LandingPage({ onStart }: { onStart: () => void }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <div className="min-h-screen bg-[#f7f6ff] text-gray-900 font-sans selection:bg-violet-600 selection:text-white overflow-hidden relative">
      <MeshGradient />

      {/* ── Navigation ── */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-20 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto"
      >
        <div className="flex items-center gap-2.5 font-bold text-xl tracking-tight">
          <Logo className="w-8 h-8" />
          <span>BaseStack</span>
        </div>
        <div className="hidden md:flex items-center gap-6">
          {['Features', 'How it works', 'Pricing'].map(item => (
            <button key={item} className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
              {item}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onStart}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden sm:block"
          >
            Sign in
          </button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={onStart}
            className="bg-gray-950 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
          >
            Get started free
          </motion.button>
        </div>
      </motion.nav>

      <main className="relative z-10">
        {/* ── Hero ── */}
        <section className="max-w-7xl mx-auto px-6 pt-16 pb-8 sm:pt-24 sm:pb-12">
          <div className="flex flex-col items-center text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-violet-200 shadow-sm text-sm font-medium text-violet-700 mb-8"
            >
              <Sparkles className="w-4 h-4 text-violet-500" />
              Powered by the latest frontier Gemini 3.1 Pro
              <span className="bg-violet-100 text-violet-700 text-xs px-2 py-0.5 rounded-full">New</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl sm:text-7xl lg:text-[5.5rem] font-semibold tracking-[-0.03em] max-w-4xl mb-6 leading-[1.05]"
            >
              Your site,{' '}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-violet-600 via-blue-600 to-violet-700 bg-clip-text text-transparent">
                  designed by AI.
                </span>
                <motion.span
                  className="absolute -bottom-1 left-0 right-0 h-1 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 opacity-40"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  style={{ transformOrigin: 'left' }}
                />
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg sm:text-xl text-gray-500 max-w-xl mb-10 leading-relaxed"
            >
              Answer a few questions. Get a fully unique, production-ready personal website in under a minute — no templates, no drag-and-drop.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-4 mb-16"
            >
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={onStart}
                className="group flex items-center gap-2 px-7 py-4 bg-gray-950 text-white rounded-full text-base font-semibold hover:bg-gray-800 transition-all shadow-xl shadow-black/15"
              >
                Start building free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                onClick={onStart}
                className="flex items-center gap-2 px-7 py-4 bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-700 rounded-full text-base font-medium hover:bg-white transition-all shadow-sm"
              >
                <Globe className="w-4 h-4 text-violet-500" />
                View examples
              </motion.button>
            </motion.div>

            {/* Social proof strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-col sm:flex-row items-center gap-4 text-sm text-gray-500 mb-16"
            >
              <div className="flex -space-x-2">
                {['AK', 'MC', 'SL', 'RB', 'JW'].map((init, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: `hsl(${240 + i * 40}, 70%, 60%)` }}
                  >
                    {init}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                </div>
                <span className="font-semibold text-gray-700">4.9</span>
                <span>· Loved by 2,400+ creators</span>
              </div>
            </motion.div>

            {/* Hero mockup with floating badges */}
            <motion.div
              initial={{ opacity: 0, y: 48 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-4xl relative"
            >
              {/* Floating badges — overlaid inside the mockup bounds */}
              <FloatingBadge className="top-10 left-4 text-emerald-700 z-20">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Site published ✨
              </FloatingBadge>
              <FloatingBadge className="bottom-20 right-4 text-violet-700 z-20">
                <Zap className="w-4 h-4 text-amber-500" />
                Generated in 38s
              </FloatingBadge>

              {/* Fade overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#f7f6ff] to-transparent z-10 rounded-b-2xl" />

              <BrowserMockup />
            </motion.div>
          </div>
        </section>

        {/* ── Stats Bar ── */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={containerVariants}
          className="max-w-5xl mx-auto px-6 py-16"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: '2,400+', label: 'Sites created' },
              { value: '<60s', label: 'Avg. generation time' },
              { value: '100%', label: 'Unique designs' },
              { value: '4.9★', label: 'User rating' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="bg-white/70 backdrop-blur-sm border border-white rounded-2xl p-6 text-center shadow-sm"
              >
                <p className="text-3xl font-bold tracking-tight text-gray-950 mb-1">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── Bento Features ── */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={containerVariants}
            className="text-center mb-14"
          >
            <motion.p variants={itemVariants} className="text-sm font-semibold text-violet-600 tracking-widest uppercase mb-4">Features</motion.p>
            <motion.h2 variants={itemVariants} className="text-4xl sm:text-5xl font-semibold tracking-tight mb-5">
              Everything you need,<br />nothing you don't.
            </motion.h2>
            <motion.p variants={itemVariants} className="text-gray-500 text-lg max-w-xl mx-auto">
              Skip the design decisions. BaseStack handles it all — from layout to copy to code.
            </motion.p>
          </motion.div>

          {/* Bento Grid */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {/* Large card - spans 2 cols */}
            <motion.div variants={itemVariants} className="md:col-span-2">
              <BentoCard
                icon={<Palette className="w-5 h-5" />}
                accent="bg-violet-500"
                title="Unique every single time"
                description="Unlike template builders, BaseStack generates layouts, color palettes, typography, and copy completely from scratch — tailored to your personality and goals."
                className="h-full"
              >
                {/* Color palette preview */}
                <div className="flex gap-2">
                  {['#6d28d9', '#2563eb', '#10b981', '#f59e0b', '#ef4444'].map(c => (
                    <motion.div
                      key={c}
                      whileHover={{ scale: 1.15, y: -2 }}
                      className="w-8 h-8 rounded-full shadow-md cursor-pointer"
                      style={{ background: c }}
                    />
                  ))}
                  <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-xs">+</div>
                </div>
              </BentoCard>
            </motion.div>

            {/* Tall card */}
            <motion.div variants={itemVariants} className="row-span-1">
              <BentoCard
                icon={<Zap className="w-5 h-5" />}
                accent="bg-amber-500"
                title="Lightning fast"
                description="From first question to live site in under 60 seconds. No waiting, no loading bars — just instant results."
                className="h-full"
              >
                {/* Speed bar */}
                <div className="space-y-2">
                  {[
                    { label: 'Generate design', pct: 95, color: 'bg-amber-500' },
                    { label: 'Write copy', pct: 80, color: 'bg-amber-400' },
                    { label: 'Build code', pct: 70, color: 'bg-amber-300' },
                  ].map(b => (
                    <div key={b.label}>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{b.label}</span><span>{b.pct}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full ${b.color} rounded-full`}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${b.pct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </BentoCard>
            </motion.div>

            {/* Regular card */}
            <motion.div variants={itemVariants}>
              <BentoCard
                icon={<Code2 className="w-5 h-5" />}
                accent="bg-blue-500"
                title="Production-ready code"
                description="Clean HTML + Tailwind CSS. Host it anywhere, or export and tweak it yourself."
                className="h-full"
              >
                <div className="bg-gray-950 rounded-xl p-3 font-mono text-xs text-emerald-400 leading-relaxed">
                  <span className="text-gray-500">// Generated for you</span><br />
                  <span className="text-blue-400">const</span> site = <span className="text-amber-300">generate</span>(<span className="text-violet-400">yourData</span>);<br />
                  site.<span className="text-blue-400">publish</span>();
                </div>
              </BentoCard>
            </motion.div>

            {/* Regular card */}
            <motion.div variants={itemVariants}>
              <BentoCard
                icon={<MousePointer2 className="w-5 h-5" />}
                accent="bg-pink-500"
                title="Tweak with AI chat"
                description="Not happy with something? Just describe what you want changed — the AI edits it live."
                className="h-full"
              >
                <div className="flex gap-2 flex-wrap">
                  {['Change colors', 'Add a blog', 'Bolder fonts', 'Dark mode'].map(tag => (
                    <span key={tag} className="px-3 py-1.5 bg-pink-50 text-pink-700 border border-pink-100 rounded-full text-xs font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </BentoCard>
            </motion.div>

            {/* Regular card */}
            <motion.div variants={itemVariants}>
              <BentoCard
                icon={<Share2 className="w-5 h-5" />}
                accent="bg-emerald-500"
                title="One-click publish"
                description="Effortlessly deploy your site on our servers in the click of one button 'Publish' and just like that it's out to the world with a custom link directly to your site. We host all users websites on our reliable cloud servers, but you can always export your site at any time."
                className="h-full"
              >
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
                  <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs text-emerald-700 font-medium truncate">alexchen.basestack.app</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 ml-auto" />
                </div>
              </BentoCard>
            </motion.div>
          </motion.div>
        </section>

        {/* ── How It Works ── */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={containerVariants}
            className="text-center mb-14"
          >
            <motion.p variants={itemVariants} className="text-sm font-semibold text-violet-600 tracking-widest uppercase mb-4">Process</motion.p>
            <motion.h2 variants={itemVariants} className="text-4xl sm:text-5xl font-semibold tracking-tight mb-5">
              Three steps to launch.
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-5 relative"
          >
            {/* Connector */}
            <div className="hidden md:block absolute top-1/2 left-[22%] right-[22%] h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent -translate-y-1/2" />

            <motion.div variants={itemVariants}>
              <StepCard
                num="1"
                icon={<span className="text-2xl font-bold text-gray-700">1</span>}
                title="Tell us about you"
                desc="Answer a short set of conversational questions about your background, projects, and goals. No forms — just a chat."
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <StepCard
                num="2"
                icon={<Wand2 className="w-8 h-8" />}
                title="AI builds your site"
                desc="Our AI designs, writes, and codes a completely custom site from scratch — no templates, ever."
                active
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <StepCard
                num="3"
                icon={<span className="text-2xl font-bold text-gray-700">3</span>}
                title="Publish & share"
                desc="One click to deploy. Get a shareable link instantly, export the clean code, or do both."
              />
            </motion.div>
          </motion.div>
        </section>

        {/* ── Testimonials ── */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={containerVariants}
            className="text-center mb-14"
          >
            <motion.p variants={itemVariants} className="text-sm font-semibold text-violet-600 tracking-widest uppercase mb-4">Testimonials</motion.p>
            <motion.h2 variants={itemVariants} className="text-4xl sm:text-5xl font-semibold tracking-tight">
              Trusted by creators.
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-5"
          >
            <motion.div variants={itemVariants}>
              <Testimonial
                quote="I had a portfolio live in 2 minutes. It looks nothing like any template I've ever seen — it feels genuinely mine."
                name="Alex Chen"
                title="Product Designer at Linear"
                avatar="AC"
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <Testimonial
                quote="The AI nailed my whole vibe without me having to explain typography or color theory. Absolutely wild."
                name="Maya Rodriguez"
                title="Indie developer & maker"
                avatar="MR"
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <Testimonial
                quote="Sent the link to a recruiter within 5 minutes of starting. Got an interview the next day."
                name="Sam Liu"
                title="Frontend engineer"
                avatar="SL"
              />
            </motion.div>
          </motion.div>
        </section>

        {/* ── CTA ── */}
        <section className="max-w-5xl mx-auto px-6 py-16 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-gray-950 rounded-[2.5rem] p-12 sm:p-20 text-center text-white overflow-hidden"
          >
            {/* Background effects */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -top-1/2 -left-1/4 w-[60%] h-[150%] bg-violet-600/20 blur-[100px] rounded-full" />
              <div className="absolute -bottom-1/2 -right-1/4 w-[60%] h-[150%] bg-blue-600/15 blur-[100px] rounded-full" />
              {/* Grid */}
              <div
                className="absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
                  backgroundSize: '40px 40px'
                }}
              />
            </div>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-medium text-gray-300 mb-8">
                <Layers className="w-4 h-4 text-violet-400" />
                Free to start — no credit card needed
              </div>
              <h2 className="text-4xl sm:text-6xl font-semibold tracking-tight mb-6">
                Ready to stand out?
              </h2>
              <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto">
                Stop spending hours tweaking templates. Let AI build something that actually feels like <em>you</em>.
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={onStart}
                className="inline-flex items-center gap-2 px-9 py-4 bg-white text-gray-900 rounded-full text-base font-semibold hover:bg-gray-100 transition-all shadow-2xl shadow-black/20"
              >
                Start building now
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 bg-white/50 backdrop-blur-sm relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold tracking-tight text-gray-900">
            <Logo className="w-6 h-6" />
            <span>BaseStack</span>
          </div>
          <p className="text-xs text-gray-400">© 2026 BaseStack. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-900 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Terms</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
