import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Code2,
  Globe2,
  Layers,
  MessageCircle,
  MousePointer2,
  Palette,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  WandSparkles,
  Zap,
} from 'lucide-react';
import heroShowcase from '../assets/landing-hero-showcase.png';
import styleBoard from '../assets/landing-style-board.png';
import Logo from './Logo';

const TRUSTED_BY = ['webflow', 'PLAID', 'stripe', 'Notion', 'loom'];

const fadeUp = {
  hidden: { opacity: 0, y: 22, filter: 'blur(8px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)' },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function LandingPage({ onStart }: { onStart: () => void }) {
  return (
    <main className="min-h-screen bg-[#f4f6ff] text-[#101936]">
      <div className="mx-auto min-h-screen w-full overflow-hidden bg-white">
        <Hero onStart={onStart} />
        <TrustedStrip />
        <FeatureShowcase />
        <BuildFlow onStart={onStart} />
        <Testimonials />
        <Pricing onStart={onStart} />
        <FinalCta onStart={onStart} />
        <Footer />
      </div>
    </main>
  );
}

function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section className="relative min-h-[840px] overflow-hidden bg-[#f4f5fe] px-5 pb-16 pt-5 sm:px-8 lg:min-h-[780px] lg:px-12 lg:pb-20">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(244,245,254,0.62)_44%,#f4f5fe_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#f4f5fe] to-transparent" />

      <motion.img
        src={heroShowcase}
        alt=""
        className="pointer-events-none absolute bottom-8 left-1/2 h-[560px] max-w-none -translate-x-[42%] opacity-95 sm:h-[640px] lg:bottom-2 lg:left-auto lg:right-[-135px] lg:h-[760px] lg:translate-x-0 xl:right-[-50px]"
        initial={{ opacity: 0, scale: 1.04, y: 28 }}
        animate={{ opacity: 0.95, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />

      <nav className="relative z-20 flex items-center justify-between">
        <button type="button" onClick={() => scrollToSection('top')} className="flex items-center gap-3">
          <Logo className="h-9 w-9 text-[#665cf6]" />
          <span className="text-2xl font-semibold text-[#101936]">BaseStack</span>
        </button>

        <div className="hidden items-center gap-1 rounded-full bg-white/78 p-1 text-sm font-semibold text-[#65708c] shadow-[0_10px_30px_rgba(36,45,80,0.08)] backdrop-blur md:flex">
          {[
            ['Features', 'features'],
            ['Process', 'process'],
            ['Pricing', 'pricing'],
          ].map(([label, id]) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollToSection(id)}
              className="rounded-full px-5 py-2 transition hover:bg-[#f3f1ff] hover:text-[#6258ff]"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onStart}
            className="hidden h-11 rounded-lg bg-white px-5 text-sm font-semibold text-[#6258ff] shadow-[0_8px_22px_rgba(35,45,80,0.1)] transition hover:bg-[#fbfbff] sm:inline-flex sm:items-center"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={onStart}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#665cf6] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(102,92,246,0.25)] transition hover:bg-[#574df0]"
          >
            Start free
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </nav>

      <motion.div
        id="top"
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative z-10 mt-16 max-w-[760px] sm:mt-20 lg:mt-24"
      >
        <motion.div
          variants={fadeUp}
          className="mb-7 inline-flex items-center gap-2 rounded-full bg-white/82 px-4 py-2 text-sm font-semibold text-[#4d5774] shadow-[0_12px_30px_rgba(80,74,170,0.1)] backdrop-blur"
        >
          <Sparkles className="h-4 w-4 text-[#665cf6]" />
          AI websites for portfolios, founders, and solo brands
          <span className="hidden rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-600 sm:inline">Live</span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="max-w-[690px] text-[48px] font-semibold leading-[1.04] tracking-normal text-[#101936] sm:text-[68px] lg:text-[82px]"
        >
          Launch a polished web presence in minutes.
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mt-6 max-w-[560px] text-lg font-medium leading-8 text-[#59647f] sm:text-xl"
        >
          BaseStack turns a short conversation into a custom site with refined copy, crisp visual direction, hosting, analytics, and export-ready code.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-9 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex h-14 items-center justify-center gap-3 rounded-lg bg-[#665cf6] px-7 text-base font-semibold text-white shadow-[0_16px_34px_rgba(102,92,246,0.28)] transition hover:bg-[#574df0]"
          >
            Build my site
            <WandSparkles className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('features')}
            className="inline-flex h-14 items-center justify-center gap-3 rounded-lg bg-white/86 px-7 text-base font-semibold text-[#27304d] shadow-[0_12px_28px_rgba(35,45,80,0.08)] backdrop-blur transition hover:text-[#6258ff]"
          >
            See what it builds
            <Globe2 className="h-5 w-5" />
          </button>
        </motion.div>

        <motion.div variants={fadeUp} className="mt-10 grid max-w-[610px] gap-3 sm:grid-cols-3">
          <Metric value="38s" label="average first draft" />
          <Metric value="1 click" label="publish or export" />
          <Metric value="24/7" label="AI editing flow" />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.45 }}
        className="absolute bottom-8 left-5 right-5 z-10 grid gap-3 sm:left-8 sm:right-auto sm:w-[480px] sm:grid-cols-2 lg:left-auto lg:right-12 lg:w-[520px]"
      >
        <FloatingNote icon={<CheckCircle2 className="h-5 w-5" />} title="Site published" text="Custom domain ready" tone="green" />
        <FloatingNote icon={<MessageCircle className="h-5 w-5" />} title="AI edit applied" text="Updated hero copy" tone="violet" />
      </motion.div>
    </section>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white/78 px-5 py-4 shadow-[0_14px_34px_rgba(55,65,110,0.08)] backdrop-blur">
      <p className="text-2xl font-semibold text-[#101936]">{value}</p>
      <p className="mt-1 text-sm font-semibold text-[#6b748f]">{label}</p>
    </div>
  );
}

function FloatingNote({
  icon,
  title,
  text,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  tone: 'green' | 'violet';
}) {
  const toneClass = tone === 'green' ? 'bg-emerald-50 text-emerald-600' : 'bg-[#f0edff] text-[#665cf6]';

  return (
    <div className="flex items-center gap-4 rounded-xl bg-white/92 p-4 shadow-[0_18px_44px_rgba(87,82,185,0.15)] backdrop-blur">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${toneClass}`}>{icon}</span>
      <span>
        <span className="block text-sm font-semibold text-[#101936]">{title}</span>
        <span className="mt-1 block text-xs font-semibold text-[#7a84a0]">{text}</span>
      </span>
    </div>
  );
}

function TrustedStrip() {
  return (
    <section className="bg-white px-5 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-6 lg:flex-row">
        <p className="text-sm font-semibold text-[#68738e]">Trusted by creators and teams at</p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-[#606982]">
          {TRUSTED_BY.map((brand) => (
            <span key={brand} className="text-xl font-semibold">
              {brand}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureShowcase() {
  return (
    <section id="features" className="bg-white px-5 py-20 sm:px-8 lg:px-12">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        className="mx-auto max-w-[1280px]"
      >
        <SectionIntro eyebrow="What it makes" title="A full web presence, not another blank canvas." text="The builder chooses layout, voice, visuals, publishing defaults, and code structure so you can start from a polished result." />

        <div className="mt-12 grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
          <motion.div variants={fadeUp} className="overflow-hidden rounded-2xl bg-[#f7f8ff] shadow-[0_20px_60px_rgba(42,52,92,0.1)]">
            <img src={styleBoard} alt="A collage of generated BaseStack website layouts and interface modules." className="h-full min-h-[420px] w-full object-cover" />
          </motion.div>

          <motion.div variants={stagger} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            <FeatureCard
              icon={<Palette className="h-6 w-6" />}
              title="Tasteful visual direction"
              text="Color, type, spacing, and section rhythm are selected as one cohesive system."
              tone="violet"
            />
            <FeatureCard
              icon={<Code2 className="h-6 w-6" />}
              title="Clean generated code"
              text="Export React and Tailwind when you want full ownership beyond hosted publishing."
              tone="blue"
            />
            <FeatureCard
              icon={<MousePointer2 className="h-6 w-6" />}
              title="Natural language edits"
              text="Ask for sharper copy, a calmer palette, new sections, or a different audience."
              tone="green"
            />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

function SectionIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="max-w-[760px]">
      <motion.p variants={fadeUp} className="text-sm font-bold uppercase tracking-[0.14em] text-[#665cf6]">
        {eyebrow}
      </motion.p>
      <motion.h2 variants={fadeUp} className="mt-4 text-4xl font-semibold leading-[1.08] tracking-normal text-[#101936] sm:text-5xl">
        {title}
      </motion.h2>
      <motion.p variants={fadeUp} className="mt-5 text-lg font-medium leading-8 text-[#59647f]">
        {text}
      </motion.p>
    </div>
  );
}

function FeatureCard({ icon, title, text, tone }: { icon: React.ReactNode; title: string; text: string; tone: 'violet' | 'blue' | 'green' }) {
  const toneClass = {
    violet: 'bg-[#f0edff] text-[#665cf6]',
    blue: 'bg-[#eef7ff] text-[#3288e8]',
    green: 'bg-[#ecfaf4] text-[#1ca96f]',
  }[tone];

  return (
    <motion.div variants={fadeUp} className="rounded-xl bg-white p-6 shadow-[0_16px_42px_rgba(43,53,90,0.08)]">
      <span className={`grid h-12 w-12 place-items-center rounded-xl ${toneClass}`}>{icon}</span>
      <h3 className="mt-5 text-xl font-semibold text-[#101936]">{title}</h3>
      <p className="mt-3 text-sm font-medium leading-6 text-[#65708c]">{text}</p>
    </motion.div>
  );
}

function BuildFlow({ onStart }: { onStart: () => void }) {
  return (
    <section id="process" className="bg-[#fbfcff] px-5 py-20 sm:px-8 lg:px-12">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        className="mx-auto max-w-[1280px]"
      >
        <SectionIntro eyebrow="How it works" title="From quick answers to a live site." text="A guided flow gathers the useful context, then BaseStack drafts, tunes, and publishes your site without making you wrestle a template." />

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          <FlowStep count="1" icon={<Bot className="h-7 w-7" />} title="Describe your goals" text="Tell BaseStack who you are, what you do, and what the site should help people understand." />
          <FlowStep count="2" icon={<WandSparkles className="h-7 w-7" />} title="Review the first draft" text="Get structure, copy, styling, and imagery composed into a finished direction." active />
          <FlowStep count="3" icon={<Rocket className="h-7 w-7" />} title="Publish and grow" text="Ship with hosting, analytics, share links, and export controls ready when you need them." />
        </div>

        <motion.div variants={fadeUp} className="mt-10 flex flex-col items-start gap-4 rounded-2xl bg-[#f3f1ff] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-[#665cf6] shadow-[0_12px_28px_rgba(88,80,190,0.12)]">
              <Zap className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-[#101936]">Want a faster first draft?</h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-[#65708c]">Start with LinkedIn, GitHub, or a short prompt and let the builder fill in the structure.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onStart}
            className="inline-flex h-12 shrink-0 items-center gap-2 rounded-lg bg-[#665cf6] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(102,92,246,0.25)] transition hover:bg-[#574df0]"
          >
            Start now
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}

function FlowStep({ count, icon, title, text, active = false }: { count: string; icon: React.ReactNode; title: string; text: string; active?: boolean }) {
  return (
    <motion.div
      variants={fadeUp}
      className={`relative overflow-hidden rounded-2xl p-7 shadow-[0_18px_44px_rgba(43,53,90,0.08)] ${
        active ? 'bg-[#111A36] text-white' : 'bg-white text-[#101936]'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <span className={`grid h-14 w-14 place-items-center rounded-xl ${active ? 'bg-white/10 text-white' : 'bg-[#f0edff] text-[#665cf6]'}`}>{icon}</span>
        <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${active ? 'bg-[#665cf6] text-white' : 'bg-[#eef1fa] text-[#65708c]'}`}>{count}</span>
      </div>
      <h3 className="mt-7 text-xl font-semibold">{title}</h3>
      <p className={`mt-3 text-sm font-medium leading-6 ${active ? 'text-[#c9cfe0]' : 'text-[#65708c]'}`}>{text}</p>
    </motion.div>
  );
}

function Testimonials() {
  return (
    <section className="bg-white px-5 py-20 sm:px-8 lg:px-12">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        className="mx-auto max-w-[1280px]"
      >
        <SectionIntro eyebrow="Proof" title="Sites that feel finished from the first draft." text="Creators use BaseStack when they want the speed of AI without sacrificing taste, polish, or ownership." />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          <Testimonial quote="I had a portfolio live before my coffee got cold. The design felt custom, not like another dressed-up template." name="Alex Chen" role="Product designer" initials="AC" />
          <Testimonial quote="It understood the audience I was aiming for and gave me a site I could actually send to investors the same day." name="Maya Rodriguez" role="Founder" initials="MR" />
          <Testimonial quote="The editing flow is the best part. I just asked for sharper positioning and it rebuilt the section cleanly." name="Sam Liu" role="Frontend engineer" initials="SL" />
        </div>
      </motion.div>
    </section>
  );
}

function Testimonial({ quote, name, role, initials }: { quote: string; name: string; role: string; initials: string }) {
  return (
    <motion.article variants={fadeUp} className="rounded-2xl bg-white p-7 shadow-[0_18px_44px_rgba(43,53,90,0.08)]">
      <div className="flex gap-1 text-[#ffb936]">
        {[0, 1, 2, 3, 4].map((item) => (
          <Star key={item} className="h-4 w-4 fill-current" />
        ))}
      </div>
      <p className="mt-6 text-base font-medium leading-7 text-[#384361]">"{quote}"</p>
      <div className="mt-7 flex items-center gap-4">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#f0edff] text-sm font-bold text-[#665cf6]">{initials}</span>
        <span>
          <span className="block text-sm font-semibold text-[#101936]">{name}</span>
          <span className="mt-1 block text-xs font-semibold text-[#7d88a4]">{role}</span>
        </span>
      </div>
    </motion.article>
  );
}

function Pricing({ onStart }: { onStart: () => void }) {
  return (
    <section id="pricing" className="bg-[#fbfcff] px-5 py-20 sm:px-8 lg:px-12">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        className="mx-auto max-w-[1280px]"
      >
        <SectionIntro eyebrow="Pricing" title="Start free, upgrade when you need more room." text="Keep testing ideas at no cost, then unlock more websites, AI operations, analytics, and premium publishing." />

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          <PlanCard
            name="Free"
            price="$0"
            note="For trying BaseStack."
            cta="Get started free"
            onStart={onStart}
            features={['3 AI operations / month', '1 website', 'HTML + Tailwind generation', 'Basic publishing controls', 'BaseStack watermark']}
          />
          <PlanCard
            name="Pro"
            price="$9"
            suffix="/month"
            note="For individuals and small projects."
            cta="Upgrade to Pro"
            onStart={onStart}
            featured
            features={['20 AI operations / month', 'Up to 5 websites', 'Portfolio analytics dashboard', 'React + Tailwind export', 'Remove BaseStack watermark', 'Fast hosting servers']}
          />
          <PlanCard
            name="Studio"
            price="$29"
            suffix="/month"
            note="For power users and agencies."
            cta="Upgrade to Studio"
            onStart={onStart}
            features={['50 AI operations / month', 'Unlimited websites', 'Advanced analytics', 'Priority support', 'Early access features', 'Fast hosting servers']}
          />
        </div>
      </motion.div>
    </section>
  );
}

function PlanCard({
  name,
  price,
  suffix,
  note,
  cta,
  features,
  featured = false,
  onStart,
}: {
  name: string;
  price: string;
  suffix?: string;
  note: string;
  cta: string;
  features: string[];
  featured?: boolean;
  onStart: () => void;
}) {
  return (
    <motion.article
      variants={fadeUp}
      className={`relative rounded-2xl bg-white p-7 shadow-[0_18px_44px_rgba(43,53,90,0.08)] ${
        featured ? 'ring-2 ring-[#d7d3ff]' : ''
      }`}
    >
      {featured && (
        <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-[#f0edff] px-3 py-1 text-xs font-bold text-[#665cf6]">
          <Sparkles className="h-3.5 w-3.5" />
          Popular
        </span>
      )}
      <div className="flex items-center gap-3">
        <span className={`grid h-11 w-11 place-items-center rounded-xl ${featured ? 'bg-[#665cf6] text-white' : 'bg-[#f0edff] text-[#665cf6]'}`}>
          {featured ? <Zap className="h-5 w-5" /> : <Layers className="h-5 w-5" />}
        </span>
        <h3 className="text-xl font-semibold text-[#101936]">{name}</h3>
      </div>
      <div className="mt-7 flex items-end gap-1">
        <span className="text-5xl font-semibold text-[#101936]">{price}</span>
        {suffix && <span className="pb-2 text-sm font-semibold text-[#7d88a4]">{suffix}</span>}
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#65708c]">{note}</p>
      <ul className="mt-7 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm font-semibold leading-6 text-[#3b4665]">
            <Check className={`mt-1 h-4 w-4 shrink-0 ${featured ? 'text-[#665cf6]' : 'text-emerald-500'}`} />
            {feature}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onStart}
        className={`mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition ${
          featured
            ? 'bg-[#665cf6] text-white shadow-[0_12px_28px_rgba(102,92,246,0.25)] hover:bg-[#574df0]'
            : 'bg-white text-[#27304d] shadow-[0_10px_24px_rgba(35,45,80,0.08)] hover:text-[#6258ff]'
        }`}
      >
        {cta}
        <ArrowRight className="h-4 w-4" />
      </button>
    </motion.article>
  );
}

function FinalCta({ onStart }: { onStart: () => void }) {
  return (
    <section className="bg-white px-5 py-20 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1280px] overflow-hidden rounded-[24px] bg-[#111A36] px-7 py-12 text-white shadow-[0_24px_70px_rgba(17,26,54,0.22)] sm:px-10 lg:px-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-[#d8ddf0]">
              <ShieldCheck className="h-4 w-4 text-[#9f98ff]" />
              Free to start, no credit card needed
            </div>
            <h2 className="max-w-[720px] text-4xl font-semibold leading-[1.08] tracking-normal sm:text-5xl">
              Give your next link a site that feels considered.
            </h2>
            <p className="mt-5 max-w-[640px] text-lg font-medium leading-8 text-[#c9cfe0]">
              Start with a few answers. Leave with a shareable site, a stronger story, and code you can own.
            </p>
          </div>
          <button
            type="button"
            onClick={onStart}
            className="inline-flex h-14 items-center justify-center gap-3 rounded-lg bg-white px-7 text-base font-semibold text-[#101936] shadow-[0_16px_34px_rgba(0,0,0,0.22)] transition hover:bg-[#f3f5fb]"
          >
            Start building
            <Rocket className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-white px-5 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-5 text-sm font-semibold text-[#75809b] md:flex-row">
        <div className="flex items-center gap-3 text-[#101936]">
          <Logo className="h-7 w-7 text-[#665cf6]" />
          <span>BaseStack</span>
        </div>
        <p>&copy; 2026 BaseStack. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <a href="#" className="transition hover:text-[#6258ff]">Privacy</a>
          <a href="#" className="transition hover:text-[#6258ff]">Terms</a>
          <a href="mailto:support@basestack.ai" className="transition hover:text-[#6258ff]">Support</a>
        </div>
      </div>
    </footer>
  );
}
