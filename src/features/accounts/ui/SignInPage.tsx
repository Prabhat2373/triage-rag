'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, MailPlus, Sparkles } from 'lucide-react';
import { AccountForm } from './AccountForm';
import { AccountLayout } from './AccountLayout';

const screens = {
  signin: {
    title: 'Welcome back',
    description: 'Sign in to your incident triage workspace.',
    submit: 'Sign in to workspace',
  },
  register: {
    title: 'Create a workspace',
    description: 'Set up a shared incident knowledge base for your team.',
    submit: 'Create workspace',
  },
} as const;

export default function SignInPage() {
  const [mode, setMode] = useState<keyof typeof screens>('signin');
  const screen = screens[mode];
  const isSigningIn = mode === 'signin';

  return (
    <AccountLayout>
      <div className="rounded-[28px] border border-[#e8e4ee] bg-white p-6 shadow-[0_18px_64px_#2814490c] sm:p-7 dark:border-white/10 dark:bg-[#1b1724]">
        <h1 className="text-4xl leading-none font-semibold tracking-[-0.065em]">{screen.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{screen.description}</p>

        <div className="mt-5">
          <AccountForm key={mode} mode={mode} submitLabel={screen.submit} />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-zinc-200 pt-3 dark:border-white/10">
          <button
            type="button"
            onClick={() => setMode(isSigningIn ? 'register' : 'signin')}
            className="min-h-10 cursor-pointer rounded-lg border border-zinc-200 px-3 text-sm font-semibold text-violet-700 hover:border-violet-300 hover:bg-violet-500/5 focus-visible:outline-2 focus-visible:outline-violet-500 dark:border-white/15 dark:text-violet-300"
          >
            {isSigningIn ? 'Create workspace' : 'Back to sign in'}
          </button>
          <Link href="/invitation" className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium text-zinc-700 hover:text-violet-700 focus-visible:outline-2 focus-visible:outline-violet-500 dark:text-zinc-300 dark:hover:text-violet-300">
            <MailPlus aria-hidden="true" className="size-4" />
            Accept an invitation
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        </div>

        {isSigningIn && (
          <Link href="/demo" className="mt-3 flex min-h-10 items-center justify-center gap-2 rounded-lg bg-violet-50 px-3 text-sm font-semibold text-violet-800 hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-violet-500 dark:bg-violet-400/10 dark:text-violet-200 dark:hover:bg-violet-400/20">
            <Sparkles aria-hidden="true" className="size-4" />
            Explore demo
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        )}
      </div>
    </AccountLayout>
  );
}
