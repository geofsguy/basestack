import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import Logo from './Logo';
import { Linkedin, Loader2 } from 'lucide-react';
import { startLinkedInOAuth } from '../services/linkedinAuth';

export default function Auth({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState<'password' | 'linkedin' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading('password');
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // Auto sign-in if email confirmation is disabled (or we prompt them to check email)
        alert('Signed up successfully!');
      }
      onAuthSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(null);
    }
  };

  const handleLinkedInAuth = async () => {
    setLoading('linkedin');
    setError(null);

    try {
      const { error } = await startLinkedInOAuth('/dashboard');
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Unable to start LinkedIn sign-in right now.');
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex relative overflow-hidden">
      {/* Subtle Grid Background */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />
      
      <div className="w-full max-w-md m-auto bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative z-10 border border-gray-100 p-10 sm:p-14">
        <div className="flex flex-col items-center mb-10">
          <Logo className="w-10 h-10 text-black mb-4" />
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            {isLogin ? 'Welcome back' : 'Create an account'}
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            {isLogin ? 'Enter your details to access your workspace.' : 'Sign up to start building with BaseStack.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading !== null}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors disabled:opacity-70"
          >
            {loading === 'password' ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-100" />
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-gray-300">or</span>
          <div className="h-px flex-1 bg-gray-100" />
        </div>

        <button
          type="button"
          onClick={handleLinkedInAuth}
          disabled={loading !== null}
          className="w-full flex items-center justify-center gap-2.5 rounded-full border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 disabled:opacity-70"
        >
          {loading === 'linkedin' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Connecting to LinkedIn...
            </>
          ) : (
            <>
              <Linkedin className="w-4 h-4" />
              Continue with LinkedIn
            </>
          )}
        </button>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
