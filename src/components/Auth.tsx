import React, { useState } from 'react';
import type { Provider } from '@supabase/supabase-js';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bot,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe2,
  Github,
  Headphones,
  Home,
  Info,
  Link2,
  Loader2,
  LockKeyhole,
  Mail,
  MessageCircle,
  Rocket,
  Send,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  Zap,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import Logo from './Logo';
import { startLinkedInOAuth } from '../services/linkedinAuth';

type LoadingState = 'password' | 'linkedin' | 'google' | 'github' | 'reset' | 'resend' | null;

const TRUSTED_BY = ['webflow', 'PLAID', 'stripe', 'Notion', 'loom'];

export default function Auth({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<LoadingState>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [signupComplete, setSignupComplete] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading('password');
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSignupEmail(email);
        setSignupComplete(true);
        return;
      }
      onAuthSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(null);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github' | 'linkedin') => {
    setLoading(provider);
    setError(null);
    setMessage(null);

    try {
      if (provider === 'linkedin') {
        const { error } = await startLinkedInOAuth('/dashboard');
        if (error) throw error;
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as Provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || `Unable to start ${provider} sign-in right now.`);
      setLoading(null);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError('Enter your email address first, then we can send a reset link.');
      return;
    }

    setLoading('reset');
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      setMessage('Password reset link sent. Check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Unable to send a reset link right now.');
    } finally {
      setLoading(null);
    }
  };

  const switchMode = (nextIsLogin: boolean) => {
    setIsLogin(nextIsLogin);
    setError(null);
    setMessage(null);
  };

  const resendSignupEmail = async () => {
    const targetEmail = signupEmail || email;
    if (!targetEmail) {
      setError('Enter your email address first, then we can resend confirmation.');
      setSignupComplete(false);
      setIsLogin(false);
      return;
    }

    setLoading('resend');
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: targetEmail,
      });
      if (error) throw error;
      setMessage('Confirmation email sent again.');
    } catch (err: any) {
      setError(err.message || 'Unable to resend confirmation right now.');
    } finally {
      setLoading(null);
    }
  };

  const editSignupEmail = () => {
    setSignupComplete(false);
    setIsLogin(false);
    setMessage(null);
    setError(null);
  };

  if (signupComplete) {
    return (
      <SignupConfirmationPage
        email={signupEmail || email}
        loading={loading}
        error={error}
        message={message}
        onResend={resendSignupEmail}
        onUseDifferentEmail={editSignupEmail}
        onSignIn={() => {
          setSignupComplete(false);
          switchMode(true);
        }}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,#ffffff_0%,#f7f8ff_36%,#eef1fb_100%)] p-3 text-[#101936] sm:p-6 lg:p-9">
      <div className="relative mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[1500px] overflow-hidden rounded-[30px] border border-white/55 bg-white/80 shadow-[0_26px_90px_rgba(39,49,92,0.11),0_0_0_1px_rgba(255,255,255,0.55)_inset] backdrop-blur sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4.5rem)]">
        <div className="pointer-events-none absolute inset-0 rounded-[30px] bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.76),transparent_35%),radial-gradient(circle_at_90%_18%,rgba(255,255,255,0.95),transparent_32%),linear-gradient(90deg,rgba(244,245,254,0.86),rgba(255,255,255,0.72)_58%,rgba(255,255,255,0.92))]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/85 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white/80 to-transparent" />
        <BrandPanel />

        <section className="relative flex flex-1 items-center justify-center bg-gradient-to-br from-white/88 via-white/72 to-white/86 px-5 py-7 sm:px-8 lg:px-14">
          <div className="absolute right-5 top-5 hidden items-center gap-4 text-sm font-medium text-[#75809b] sm:flex lg:right-10 lg:top-10">
            <span>Need help?</span>
            <a
              href="mailto:support@basestack.ai"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[#e1e5f0] bg-white px-5 text-[#27304d] shadow-[0_8px_24px_rgba(34,45,80,0.05)] transition hover:border-[#c7cef8] hover:text-[#6258ff]"
            >
              <MessageCircle className="h-4 w-4" />
              Contact support
            </a>
          </div>

          <div className="w-full max-w-[570px] pt-12 sm:pt-20 lg:pt-16">
            <div className="rounded-[24px] border border-[#edf0f6]/70 bg-white/82 px-6 py-7 shadow-[0_28px_90px_rgba(31,40,76,0.08),0_0_0_1px_rgba(255,255,255,0.68)_inset] backdrop-blur sm:px-11 sm:py-10">
              <div className="mb-10 grid grid-cols-2 border-b border-[#dfe4ee]/75 text-center text-sm font-semibold text-[#7d88a4]">
                <button
                  type="button"
                  onClick={() => switchMode(true)}
                  className={`relative pb-5 transition ${isLogin ? 'text-[#675bff]' : 'hover:text-[#4b5574]'}`}
                >
                  Sign In
                  {isLogin && (
                    <motion.span
                      layoutId="auth-active-tab"
                      className="absolute inset-x-0 -bottom-px mx-auto h-0.5 w-[78%] rounded-full bg-[#675bff]"
                      transition={{ type: 'spring', stiffness: 430, damping: 34 }}
                    />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => switchMode(false)}
                  className={`relative pb-5 transition ${!isLogin ? 'text-[#675bff]' : 'hover:text-[#4b5574]'}`}
                >
                  Create Account
                  {!isLogin && (
                    <motion.span
                      layoutId="auth-active-tab"
                      className="absolute inset-x-0 -bottom-px mx-auto h-0.5 w-[78%] rounded-full bg-[#675bff]"
                      transition={{ type: 'spring', stiffness: 430, damping: 34 }}
                    />
                  )}
                </button>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={isLogin ? 'login' : 'signup'}
                  initial={{ opacity: 0, x: isLogin ? -18 : 18, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, x: isLogin ? 18 : -18, filter: 'blur(6px)' }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="mb-8">
                    <h1 className="text-2xl font-semibold tracking-tight text-[#101936]">
                      {isLogin ? 'Welcome back' : 'Create your account'}
                    </h1>
                    <p className="mt-2 text-sm font-medium text-[#6d7894]">
                      {isLogin
                        ? 'Sign in to continue building with BaseStack.'
                        : 'Start building polished websites with BaseStack.'}
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#1b2442]">Email address</label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8490a9]" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          autoComplete="email"
                          className="h-12 w-full rounded-lg border border-[#dde3ee] bg-white pl-12 pr-4 text-sm font-medium text-[#1b2442] outline-none transition placeholder:text-[#9aa4ba] focus:border-[#776dff] focus:ring-4 focus:ring-[#756bff]/10"
                          placeholder="amspeedwagon@gmail.com"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label className="block text-sm font-semibold text-[#1b2442]">Password</label>
                        {isLogin && (
                          <motion.span
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.18 }}
                          >
                            <button
                              type="button"
                              onClick={handlePasswordReset}
                              disabled={loading !== null}
                              className="text-xs font-semibold text-[#9189ff] transition hover:text-[#6258ff] disabled:opacity-60"
                            >
                              {loading === 'reset' ? 'Sending...' : 'Forgot password?'}
                            </button>
                          </motion.span>
                        )}
                      </div>
                      <div className="relative">
                        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8490a9]" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                          autoComplete={isLogin ? 'current-password' : 'new-password'}
                          className="h-12 w-full rounded-lg border border-[#dde3ee] bg-white pl-12 pr-12 text-sm font-medium text-[#1b2442] outline-none transition placeholder:text-[#9aa4ba] focus:border-[#776dff] focus:ring-4 focus:ring-[#756bff]/10"
                          placeholder="Password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((value) => !value)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full text-[#8490a9] transition hover:text-[#6258ff]"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                        {error}
                      </div>
                    )}

                    {message && (
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                        {message}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading !== null}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#665cf6] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(102,92,246,0.25)] transition hover:bg-[#574df0] focus:outline-none focus:ring-4 focus:ring-[#756bff]/20 disabled:opacity-70"
                    >
                      {loading === 'password' && <Loader2 className="h-4 w-4 animate-spin" />}
                      {loading === 'password'
                        ? 'Processing...'
                        : isLogin
                          ? 'Sign in to BaseStack'
                          : 'Create BaseStack account'}
                    </button>
                  </form>

                  <div className="my-8 flex items-center gap-5">
                    <div className="h-px flex-1 bg-[#edf0f6]" />
                    <span className="text-sm font-medium text-[#7d88a4]">or continue with</span>
                    <div className="h-px flex-1 bg-[#edf0f6]" />
                  </div>

                  <div className="space-y-2">
                    <SocialButton
                      label="Continue with Google"
                      loading={loading === 'google'}
                      disabled={loading !== null}
                      onClick={() => handleOAuth('google')}
                      icon={<GoogleMark />}
                    />
                    <SocialButton
                      label="Continue with GitHub"
                      loading={loading === 'github'}
                      disabled={loading !== null}
                      onClick={() => handleOAuth('github')}
                      icon={<Github className="h-5 w-5 text-[#111827]" />}
                    />
                    <SocialButton
                      label="Continue with LinkedIn"
                      loading={loading === 'linkedin'}
                      disabled={loading !== null}
                      onClick={() => handleOAuth('linkedin')}
                      icon={<LinkedInMark />}
                    />
                  </div>

                  <p className="mt-9 text-center text-sm font-medium text-[#6d7894]">
                    {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                    <button
                      type="button"
                      onClick={() => switchMode(!isLogin)}
                      className="font-semibold text-[#6258ff] transition hover:text-[#4f45e8]"
                    >
                      {isLogin ? 'Create one' : 'Sign in'}
                    </button>
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-8 flex items-center justify-center gap-3 text-sm font-medium text-[#6f7892]">
              <ShieldCheck className="h-5 w-5 text-[#768199]" />
              Your data is secure and encrypted
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function SignupConfirmationPage({
  email,
  loading,
  error,
  message,
  onResend,
  onUseDifferentEmail,
  onSignIn,
}: {
  email: string;
  loading: LoadingState;
  error: string | null;
  message: string | null;
  onResend: () => void;
  onUseDifferentEmail: () => void;
  onSignIn: () => void;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fbfcff] px-5 py-6 text-[#101936] sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(118,104,255,0.08),transparent_28%),linear-gradient(180deg,#ffffff_0%,#fbfbff_52%,#f3f1ff_100%)]" />
      <div className="pointer-events-none absolute -bottom-52 -left-40 h-[560px] w-[760px] rotate-[-16deg] rounded-[50%] border border-[#ddd8ff] bg-[#ebe8ff]/80 blur-[1px]" />
      <div className="pointer-events-none absolute -right-56 top-36 h-[520px] w-[760px] rotate-[-10deg] rounded-[50%] border border-[#e1ddff] bg-[#f0edff]/80" />
      <div className="pointer-events-none absolute right-24 top-36 hidden h-52 w-52 bg-[radial-gradient(circle,#d9d4ff_1.5px,transparent_1.5px)] [background-size:18px_18px] opacity-70 lg:block" />

      <nav className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo className="h-10 w-10 text-[#665cf6]" />
          <span className="text-2xl font-semibold tracking-tight">BaseStack</span>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium text-[#5f6a86]">
          <span className="hidden sm:inline">Already have an account?</span>
          <button
            type="button"
            onClick={onSignIn}
            className="h-11 rounded-lg border border-[#e0e4f0] bg-white px-5 font-semibold text-[#6258ff] shadow-[0_8px_22px_rgba(35,45,80,0.1)] transition hover:border-[#c9cffc] hover:bg-[#fbfbff]"
          >
            Sign in
          </button>
        </div>
      </nav>

      <ConfirmationDecor />

      <section className="relative z-10 mx-auto mt-6 flex w-full max-w-[780px] flex-col items-center sm:mt-12">
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="w-full rounded-[24px] border border-[#dfe4f0] bg-white/95 px-7 py-8 shadow-[0_26px_80px_rgba(30,40,86,0.12)] backdrop-blur sm:px-10 lg:px-11"
        >
          <div className="mb-9 flex items-center gap-5 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-700">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
              <Check className="h-5 w-5" />
            </span>
            <p className="text-sm font-semibold sm:text-base">Signed up successfully. Check your inbox if email confirmation is enabled.</p>
          </div>

          <div className="mx-auto flex max-w-[610px] flex-col items-center text-center">
            <div className="relative grid h-24 w-24 place-items-center rounded-full bg-[#efedff] text-[#4f45e8]">
              <Mail className="h-12 w-12" />
              <Sparkles className="absolute -left-8 top-9 h-4 w-4 text-[#8c84ff]" />
              <Sparkles className="absolute -right-8 top-10 h-4 w-4 text-[#8c84ff]" />
              <span className="absolute -right-3 top-6 h-2 w-2 rounded-full bg-[#9c94ff]" />
              <span className="absolute -left-4 bottom-7 h-2 w-2 rounded-full bg-[#9c94ff]" />
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-[#101936] sm:text-[42px]">Check your email</h1>
            <p className="mt-4 max-w-[560px] text-base font-medium leading-7 text-[#56617d]">
              We've sent a confirmation link to your inbox. Please verify your email address before you continue.
            </p>

            <div className="mt-6 flex w-full max-w-[490px] items-center justify-between gap-3 rounded-lg border border-[#dfe4ee] bg-[#f8f9fe] px-5 py-3 text-sm font-medium text-[#56617d]">
              <span className="flex min-w-0 items-center gap-3">
                <Mail className="h-5 w-5 shrink-0 text-[#9aa4ba]" />
                <span className="truncate">Sent to: {email || 'your email address'}</span>
              </span>
              <button type="button" onClick={onUseDifferentEmail} className="shrink-0 font-semibold text-[#6258ff] transition hover:text-[#4f45e8]">
                Change
              </button>
            </div>

            <div className="mt-5 grid w-full max-w-[520px] gap-4 sm:grid-cols-2">
              <a
                href="https://mail.google.com/"
                target="_blank"
                rel="noreferrer"
                className="flex h-12 items-center justify-center gap-3 rounded-lg bg-[#665cf6] px-5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(102,92,246,0.25)] transition hover:bg-[#574df0]"
              >
                <GoogleMailMark />
                Open Gmail
              </a>
              <button
                type="button"
                onClick={onResend}
                disabled={loading !== null}
                className="flex h-12 items-center justify-center gap-3 rounded-lg border border-[#665cf6] bg-white px-5 text-sm font-semibold text-[#6258ff] transition hover:bg-[#fbfbff] disabled:opacity-70"
              >
                {loading === 'resend' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                {loading === 'resend' ? 'Sending...' : 'Resend email'}
              </button>
            </div>

            <button
              type="button"
              onClick={onUseDifferentEmail}
              className="mt-5 text-sm font-semibold text-[#6258ff] transition hover:text-[#4f45e8]"
            >
              Use a different email
            </button>

            {error && (
              <div className="mt-5 w-full rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-left text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            {message && (
              <div className="mt-5 w-full rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-left text-sm font-medium text-emerald-700">
                {message}
              </div>
            )}
          </div>

          <div className="my-9 flex items-center gap-5">
            <div className="h-px flex-1 bg-[#e7ebf4]" />
            <span className="text-sm font-semibold text-[#6e7895]">What happens next?</span>
            <div className="h-px flex-1 bg-[#e7ebf4]" />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <NextStep icon={<Mail className="h-6 w-6" />} count="1" title="Open your inbox" text="Look for an email from BaseStack in your inbox." />
            <NextStep icon={<Link2 className="h-6 w-6" />} count="2" title="Click the verification link" text="This confirms your email and activates your account." />
            <NextStep icon={<Rocket className="h-6 w-6" />} count="3" title="Start building with BaseStack" text="Once verified, you'll get full access to your dashboard." />
          </div>

          <div className="mt-7 flex items-center gap-4 rounded-lg border border-[#dfdcff] bg-[#f3f1ff] px-5 py-4 text-sm font-medium text-[#3c3677]">
            <Info className="h-5 w-5 shrink-0 text-[#7b73ff]" />
            <p>Don't see the email? Check your spam or junk folder. If it's not there, you can resend the email.</p>
          </div>
        </motion.div>
      </section>

      <section className="relative z-10 mx-auto mt-8 grid max-w-[1400px] gap-5 lg:grid-cols-[1fr_1fr_1fr_0.95fr]">
        <FooterFeature icon={<ShieldCheck className="h-8 w-8" />} title="Secure account setup" text="Your data is encrypted and always protected." />
        <FooterFeature icon={<Zap className="h-8 w-8" />} title="Fast onboarding" text="Get started in minutes and deploy in seconds." />
        <FooterFeature icon={<Headphones className="h-8 w-8" />} title="Support available" text="Our team is here to help you succeed." />
        <div className="rounded-xl border border-[#dfe4f0] bg-white/85 p-5 shadow-[0_18px_45px_rgba(50,60,100,0.08)] backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-[#101936]">Need help?</h3>
              <p className="mt-3 text-sm font-medium leading-6 text-[#65708c]">Contact our support team and we'll get back to you.</p>
              <a href="mailto:support@basestack.ai" className="mt-3 inline-flex text-sm font-semibold text-[#6258ff]">
                Contact support {'->'}
              </a>
            </div>
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-[#e5e1ff] bg-[#f2efff] text-[#665cf6]">
              <MessageCircle className="h-8 w-8" />
            </span>
          </div>
        </div>
      </section>

      <footer className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-x-9 gap-y-3 pb-1 text-xs font-medium text-[#75809b]">
        <span>&copy; 2024 BaseStack Inc. All rights reserved.</span>
        <a href="#" className="text-[#6258ff]">Privacy Policy</a>
        <a href="#" className="text-[#6258ff]">Terms of Service</a>
      </footer>
    </main>
  );
}

function ConfirmationDecor() {
  return (
    <>
      <div className="pointer-events-none absolute left-[-58px] top-[285px] hidden h-[380px] w-[430px] -rotate-3 rounded-2xl border border-[#e5e8f3] bg-white/70 p-8 shadow-[0_24px_70px_rgba(83,76,190,0.12)] lg:block">
        <div className="mb-5 flex items-center gap-3">
          <span className="text-lg font-semibold">My Portfolio</span>
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
        </div>
        <div className="h-3 w-40 rounded-full bg-[#e5e8f3]" />
        <div className="mt-3 h-3 w-28 rounded-full bg-[#eceffa]" />
        <div className="mt-8 h-[7.5rem] rounded-lg bg-gradient-to-br from-[#eeeaff] via-[#c7c0ff] to-[#8178e8]" />
        <div className="mt-7 rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-[#5e6883]">Visitors</p>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-2xl font-semibold">24.8K</span>
            <span className="text-xs font-bold text-emerald-500">+12%</span>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute right-[-72px] top-[270px] hidden h-[430px] w-[420px] rotate-[-6deg] rounded-2xl border border-[#e5e8f3] bg-white/75 shadow-[0_24px_70px_rgba(83,76,190,0.12)] lg:block">
        <div className="flex h-full">
          <div className="w-20 border-r border-[#edf0f6] p-5 text-[#c4c9dc]">
            <Logo className="mb-8 h-5 w-5 text-[#8b83ff]" />
            <div className="grid gap-7">
              <Home className="h-6 w-6 rounded-md bg-[#ebe8ff] p-1 text-[#665cf6]" />
              <ShieldCheck className="h-5 w-5" />
              <Globe2 className="h-5 w-5" />
            </div>
          </div>
          <div className="flex-1 p-7">
            <p className="mb-7 text-base font-semibold text-[#6b748f]">Dashboard</p>
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-[#5e6883]">Projects</p>
              <div className="mt-4 flex items-end justify-between">
                <span className="text-3xl font-semibold">12</span>
                <span className="text-xs font-bold text-emerald-500">+20%</span>
              </div>
              <div className="mt-6 flex h-20 items-end gap-2 text-[#9a92ff]">
                {[18, 24, 42, 58, 37, 72, 88, 70].map((height, index) => (
                  <span key={index} className="w-4 rounded-full bg-current/75" style={{ height }} />
                ))}
              </div>
            </div>
            <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
              <p className="mb-4 text-sm font-semibold">Recent Activity</p>
              {['Site deployed', 'Custom domain connected', 'Team member added'].map((item) => (
                <div key={item} className="mb-3 flex items-center justify-between text-xs font-medium text-[#66708b]">
                  <span>{item}</span>
                  <span className="text-[#a1a9bd]">2m ago</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute left-36 top-48 hidden h-16 w-16 rotate-[14deg] place-items-center rounded-2xl bg-white text-[#665cf6] shadow-[0_16px_40px_rgba(78,70,170,0.14)] lg:grid">
        <Check className="h-8 w-8 rounded-full bg-[#766dff] p-1 text-white" />
      </div>
      <div className="pointer-events-none absolute bottom-72 left-14 hidden h-16 w-16 -rotate-6 place-items-center rounded-2xl bg-white text-[#665cf6] shadow-[0_16px_40px_rgba(78,70,170,0.14)] lg:grid">
        <Globe2 className="h-8 w-8" />
      </div>
      <div className="pointer-events-none absolute bottom-72 right-52 hidden h-16 w-16 rotate-6 place-items-center rounded-2xl bg-white text-[#665cf6] shadow-[0_16px_40px_rgba(78,70,170,0.14)] lg:grid">
        <Zap className="h-8 w-8" />
      </div>
    </>
  );
}

function NextStep({ icon, count, title, text }: { icon: React.ReactNode; count: string; title: string; text: string }) {
  return (
    <div className="border-[#e7ebf4] md:border-r md:pr-6 md:last:border-r-0">
      <div className="flex items-center gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#f0edff] text-[#665cf6]">{icon}</span>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#665cf6] text-sm font-semibold text-white">{count}</span>
      </div>
      <h3 className="mt-4 font-semibold text-[#101936]">{title}</h3>
      <p className="mt-2 text-sm font-medium leading-6 text-[#5f6a86]">{text}</p>
    </div>
  );
}

function FooterFeature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-center gap-5">
      <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-[#dfe4f0] bg-white text-[#665cf6] shadow-[0_14px_36px_rgba(63,72,115,0.08)]">
        {icon}
      </span>
      <span>
        <h3 className="text-sm font-semibold text-[#101936]">{title}</h3>
        <p className="mt-2 max-w-[220px] text-sm font-medium leading-6 text-[#65708c]">{text}</p>
      </span>
    </div>
  );
}

function GoogleMailMark() {
  return (
    <span className="grid h-5 w-5 place-items-center rounded bg-white text-sm font-bold text-[#ea4335]">
      M
    </span>
  );
}

function BrandPanel() {
  return (
    <section className="relative hidden w-[52%] min-w-[600px] overflow-hidden bg-gradient-to-br from-[#f6f7ff]/92 via-[#f2f4fd]/78 to-white/52 px-16 py-12 lg:block">
      <div className="pointer-events-none absolute inset-y-0 right-[-1px] w-20 bg-gradient-to-r from-transparent via-white/45 to-white/88" />
      <div className="pointer-events-none absolute inset-y-10 right-0 w-px bg-gradient-to-b from-transparent via-[#dfe3f1]/55 to-transparent" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full border border-white/75 bg-[#dcd8ff]" />
      <div className="pointer-events-none absolute -bottom-40 -right-28 h-[920px] w-[920px] rounded-full border border-white/60 bg-white/45" />
      <div className="pointer-events-none absolute right-8 top-0 h-full w-[42%] bg-gradient-to-b from-transparent via-white/40 to-transparent" />

      <div className="relative z-10">
        <div className="mb-14 flex items-center gap-3">
          <Logo className="h-9 w-9 text-[#665cf6]" />
          <span className="text-2xl font-semibold tracking-tight text-[#101936]">BaseStack</span>
        </div>

        <h2 className="max-w-[530px] text-[48px] font-semibold leading-[1.08] tracking-tight text-[#101936]">
          Build your presence with{' '}
          <span className="bg-gradient-to-r from-[#5fa0ff] to-[#b478ff] bg-clip-text text-transparent">AI</span>
        </h2>
        <p className="mt-5 max-w-[470px] text-lg font-medium leading-8 text-[#59647f]">
          BaseStack helps you create stunning websites and portfolios in minutes--no code, just creativity.
        </p>

        <div className="mt-8 space-y-4">
          <Feature icon={<Bot className="h-5 w-5" />} label="AI-powered website builder" />
          <Feature icon={<CheckCircle2 className="h-5 w-5" />} label="Stunning portfolio templates" />
          <Feature icon={<Rocket className="h-5 w-5" />} label="Publish and grow your brand" />
        </div>

        <MockupScene />

        <div className="mt-12 pl-14">
          <p className="mb-5 text-sm font-medium text-[#68738e]">Trusted by creators and teams at</p>
          <div className="flex flex-wrap items-center gap-x-9 gap-y-4 text-[#606982]">
            {TRUSTED_BY.map((brand) => (
              <span key={brand} className="text-xl font-semibold tracking-[-0.03em]">
                {brand}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-4 text-[15px] font-semibold text-[#202a47]">
      <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#7068ff] text-[#7068ff]">
        {icon}
      </span>
      {label}
    </div>
  );
}

function MockupScene() {
  return (
    <div className="relative mt-10 h-[325px]">
      <div className="absolute left-[165px] top-4 h-[310px] w-[455px] -rotate-3 rounded-xl border border-[#b8bfff] bg-gradient-to-br from-white via-[#f8f7ff] to-[#e9e6ff] shadow-[0_22px_60px_rgba(101,92,246,0.28)]">
        <div className="absolute right-8 top-5 flex gap-5 text-[7px] font-semibold text-[#707b97]">
          <span>Work</span>
          <span>About</span>
          <span>Contact</span>
        </div>

        <div className="absolute left-24 top-[118px]">
          <h3 className="text-xl font-semibold text-[#111a36]">I'm Alex Morgan</h3>
          <p className="mt-3 text-xs font-semibold text-[#3b4665]">Product Designer</p>
          <p className="mt-1 max-w-[155px] text-xs leading-4 text-[#64708c]">Crafting beautiful digital experiences.</p>
          <button className="mt-5 rounded-full bg-[#665cf6] px-5 py-2 text-[10px] font-semibold text-white shadow-[0_8px_18px_rgba(102,92,246,0.32)]">
            View work
          </button>
        </div>

        <div className="absolute bottom-0 right-[8.5rem] h-[222px] w-[128px] overflow-hidden rounded-t-[70px] bg-gradient-to-b from-[#202844] via-[#6f65ff] to-[#b7b4ff]">
          <div className="absolute left-1/2 top-5 h-20 w-24 -translate-x-1/2 rounded-full bg-[#141a2e] shadow-[10px_4px_0_#111728]" />
          <div className="absolute left-8 top-20 h-20 w-16 rounded-full bg-[#f2c5ae]" />
          <div className="absolute left-12 top-26 h-5 w-10 rounded-full bg-[#f5d2c0]" />
          <div className="absolute bottom-0 left-0 h-24 w-full bg-[#7a70ff]" />
        </div>

        <div className="absolute bottom-0 left-20 h-44 w-[250px] rounded-t-lg bg-white/78 px-6 py-6">
          <p className="text-xs font-semibold text-[#25304d]">About me</p>
          <div className="mt-5 h-2 w-44 rounded-full bg-[#dfe3f7]" />
          <div className="mt-3 h-2 w-32 rounded-full bg-[#ecefff]" />
        </div>
      </div>

      <FloatingCard className="left-0 top-[5rem] w-[180px]">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-[#1b2442]">
            <span className="text-[#665cf6]">AI</span> Assistant
          </span>
          <WandSparkles className="h-4 w-4 text-[#665cf6]" />
        </div>
        <p className="text-sm font-medium leading-5 text-[#2f3a59]">Let's create your perfect portfolio.</p>
        <div className="mt-4 h-2 w-full rounded-full bg-[#eef0fb]" />
        <div className="absolute -bottom-3 right-6 flex h-7 w-7 items-center justify-center rounded-full bg-[#7168ff] text-white shadow-lg">
          <Sparkles className="h-4 w-4" />
        </div>
      </FloatingCard>

      <FloatingCard className="bottom-16 right-0 w-[178px]">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[#1b2442]">Site Analytics</p>
          <span className="text-xs font-bold text-emerald-500">+24%</span>
        </div>
        <div className="mt-7 flex h-16 items-end gap-1 text-[#7068ff]">
          {[20, 34, 48, 40, 52, 38, 48, 70, 62, 78].map((height, index) => (
            <span key={index} className="w-2 rounded-full bg-current" style={{ height }} />
          ))}
        </div>
        <p className="mt-4 text-xs font-medium text-[#7d88a4]">vs last 7 days</p>
      </FloatingCard>

      <FloatingCard className="bottom-12 left-12 flex w-[130px] items-center gap-2 px-4 py-3">
        <Sparkles className="h-4 w-4 text-[#665cf6]" />
        <span className="text-xs font-semibold text-[#1d2745]">Generating...</span>
      </FloatingCard>

      <div className="absolute right-24 top-48 h-3 w-3 rounded-full bg-[#766dff]/60" />
      <div className="absolute left-[13.5rem] top-44 h-4 w-4 rounded-full bg-[#766dff]/30" />
    </div>
  );
}

function FloatingCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`absolute rounded-lg border border-[#edf0f8] bg-white/95 p-5 shadow-[0_18px_44px_rgba(87,82,185,0.16)] backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}

function SocialButton({
  icon,
  label,
  loading,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-[#dfe4ee] bg-white px-4 text-sm font-semibold text-[#1d2745] transition hover:border-[#c9cffc] hover:bg-[#fbfbff] disabled:opacity-70"
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-[#665cf6]" /> : icon}
      {loading ? 'Connecting...' : label}
    </button>
  );
}

function GoogleMark() {
  return (
    <span className="grid h-5 w-5 place-items-center text-lg font-bold leading-none">
      <span className="bg-gradient-to-r from-[#4285f4] via-[#34a853] to-[#fbbc05] bg-clip-text text-transparent">G</span>
    </span>
  );
}

function LinkedInMark() {
  return (
    <span className="grid h-5 w-5 place-items-center rounded bg-[#0a66c2] text-[13px] font-bold leading-none text-white">
      in
    </span>
  );
}
