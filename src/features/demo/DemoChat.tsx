'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, CircleHelp, GitFork, LogIn, MessageSquare, Moon, Plus, Shield, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { ChatInterface } from '@/features/chat/ui/ChatInterface';
import { demoIncidents } from './incidents';
import { DemoKnowledgeBase } from './DemoKnowledgeBase';
import { DemoGuide } from './DemoGuide';

const screens = [
  { label: 'Chat', icon: MessageSquare },
  { label: 'Knowledge base', icon: BookOpen },
  { label: 'How RAG works', icon: CircleHelp },
] as const;

const suggestions = demoIncidents.slice(0, 4).map(({ id, title, category }) => ({
  id, title, category, query: `How was this resolved? ${title}`,
}));

export function DemoChat({ modelName, showSignInLink = false }: { modelName: string; showSignInLink?: boolean }) {
  const { isDark, toggleTheme } = useTheme();
  const themeAction = isDark ? 'Use light theme' : 'Use dark theme';
  const [screen, setScreen] = useState<typeof screens[number]['label']>('Chat');
  const [conversation, setConversation] = useState(0);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  return (
    <main className="flex h-dvh min-h-0 flex-col bg-white text-slate-950 dark:bg-[#211d2b] dark:text-white">
      <header className="shrink-0 border-b border-slate-200 dark:border-white/10">
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6 lg:grid-cols-[1fr_auto_1fr]">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="hidden size-9 shrink-0 place-items-center rounded-xl bg-violet-700 text-white sm:grid">
              <Shield aria-hidden="true" className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">TriageRAG demo</p>
              <p className="hidden text-xs text-slate-600 sm:block dark:text-slate-300">Chats reset on refresh</p>
            </div>
          </div>
          <nav aria-label="Demo navigation" className="order-last col-span-2 flex flex-wrap items-center gap-1 lg:order-none lg:col-span-1">
            {screens.map(({ label, icon: Icon }) => (
              <button key={label} type="button" aria-current={screen === label ? 'page' : undefined}
                onClick={() => setScreen(label)}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-violet-500 sm:px-3 ${screen === label ? 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/8'}`}>
                <Icon aria-hidden="true" className="hidden size-4 sm:block" />
                {label}
              </button>
            ))}
          </nav>
          <div className="flex items-center justify-end gap-2">
            <a href="https://github.com/Prabhat2373/triage-rag" target="_blank" rel="noopener noreferrer"
              aria-label="TriageRAG on GitHub (opens in a new tab)" title="TriageRAG on GitHub"
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium text-slate-700 hover:bg-violet-500/10 focus-visible:outline-2 focus-visible:outline-violet-500 dark:text-slate-200">
              <GitFork aria-hidden="true" className="size-4" />
              <span className="hidden xl:inline">GitHub</span>
            </a>
            {showSignInLink && (
              <Link href="/login" aria-label="Back to sign in" title="Back to sign in" className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-slate-700 hover:bg-violet-500/10 focus-visible:outline-2 focus-visible:outline-violet-500 dark:text-slate-200">
                <LogIn aria-hidden="true" className="size-4" />
                <span className="hidden sm:inline">Sign in</span>
              </Link>
            )}
            <button type="button" onClick={toggleTheme} aria-label={themeAction} title={themeAction}
              className="grid size-10 shrink-0 place-items-center rounded-lg border border-slate-200 hover:bg-violet-500/10 focus-visible:outline-2 focus-visible:outline-violet-500 dark:border-white/15">
              {isDark ? <Sun aria-hidden="true" className="size-4" /> : <Moon aria-hidden="true" className="size-4" />}
            </button>
            <button type="button" onClick={() => {
              setScreen('Chat');
              setConversation((current) => current + 1);
              setEvidenceOpen(false);
            }} className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-lg bg-violet-700 px-3 text-sm font-semibold text-white hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500">
              <Plus aria-hidden="true" className="size-4" /> New chat
            </button>
          </div>
        </div>
      </header>
      <div hidden={screen !== 'Chat'} className={screen === 'Chat' ? 'flex min-h-0 flex-1' : undefined}>
        <ChatInterface
          key={conversation}
          demoIncidents={demoIncidents}
          chatEndpoint="/api/demo/chat"
          incidentSuggestions={{ hasIncidents: true, suggestions }}
          initialChatMessages={[]}
          activeSessionId={null}
          selectedModel={modelName}
          modelOptions={[]}
          onSelectModel={() => {}}
          evidenceOpen={evidenceOpen}
          onCloseEvidence={() => setEvidenceOpen(false)}
          onOpenEvidence={() => setEvidenceOpen(true)}
        />
      </div>
      {screen === 'Knowledge base' && <DemoKnowledgeBase />}
      {screen === 'How RAG works' && <DemoGuide onOpenChat={() => setScreen('Chat')} />}
    </main>
  );
}
