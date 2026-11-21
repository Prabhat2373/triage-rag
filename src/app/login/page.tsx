'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ArrowRight, Lock, Building2, User, Mail, Sparkles, Sun, Moon } from 'lucide-react';
import { loginAction, registerAction } from '@/app/actions';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDark, setIsDark] = useState(true);

  // Toggle theme
  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSignIn = (emailToUse?: string) => {
    const targetEmail = emailToUse || email;
    if (!targetEmail.trim()) {
      setError('Please provide an email address');
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await loginAction(targetEmail);
      if (res.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(res.error || 'Failed to sign in');
      }
    });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !orgName.trim()) {
      setError('All fields are required');
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await registerAction({ name, email, orgName });
      if (res.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(res.error || 'Registration failed');
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between p-6 transition-colors duration-200">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md text-white font-bold">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">TriageRAG</span>
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
              Enterprise
            </span>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition shadow-xs"
          title="Toggle light/dark theme"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      {/* Center Auth Card */}
      <div className="max-w-md w-full mx-auto my-12">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-xl p-8 transition-colors">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {tab === 'signin' ? 'Welcome back' : 'Create an organization'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {tab === 'signin'
                ? 'Sign in to access your air-gapped incident resolution copilot'
                : 'Set up private RAG triage for your engineering & SRE teams'}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-xl mb-6 border border-slate-200/80 dark:border-slate-800/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setTab('signin');
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                tab === 'signin'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                tab === 'register'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Register Organization
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 font-medium">
              {error}
            </div>
          )}

          {/* Sign In Form */}
          {tab === 'signin' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSignIn();
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Work Email</label>
                <div className="relative mt-1">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex.admin@acme.corp"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Password</label>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                    Forgot password?
                  </span>
                </div>
                <div className="relative mt-1">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    defaultValue="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isPending ? 'Signing in...' : 'Sign In to Workspace'}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-white dark:bg-slate-900 px-2 text-slate-400 font-semibold tracking-wider">
                    Or continue with
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSignIn('alex.admin@acme.corp')}
                className="w-full py-2 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="h-3.5 w-3.5 text-indigo-500" />
                Single Sign-On (Okta / Google Workspace)
              </button>
            </form>
          )}

          {/* Register Form */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Your Full Name</label>
                <div className="relative mt-1">
                  <User className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jordan Vance"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Organization / Company Name</label>
                <div className="relative mt-1">
                  <Building2 className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="ScaleTech Systems"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Work Email</label>
                <div className="relative mt-1">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jordan@scaletech.io"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isPending ? 'Creating Organization...' : 'Create Organization Workspace'}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          )}

          {/* Quick Demo Personas */}
          <div className="mt-8 pt-5 border-t border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Demo Quick Access (Click to sign in):
            </div>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleSignIn('alex.admin@acme.corp')}
                className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 text-xs transition flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Alex Rivera (Admin)</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Acme Cloud Corp · alex.admin@acme.corp</div>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300">
                  Admin
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSignIn('sarah.oncall@acme.corp')}
                className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 text-xs transition flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Sarah Chen (On-Call SRE)</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Acme Cloud Corp · sarah.oncall@acme.corp</div>
                </div>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300">
                  Member
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSignIn('elena.lead@fintechpay.com')}
                className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 text-xs transition flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Elena Rostova (Fintech Admin)</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Fintech Payments Ltd (Isolated Tenant)</div>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                  Tenant #2
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto w-full text-center text-xs text-slate-400">
        TriageRAG Enterprise Incident Intelligence · 100% Air-Gapped Local Execution
      </div>
    </div>
  );
}
