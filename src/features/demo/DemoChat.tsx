'use client';

import { useState } from 'react';
import { Shield } from 'lucide-react';
import { ChatInterface } from '@/features/chat/ui/ChatInterface';
import { demoIncidents } from './incidents';
import { DemoKnowledgeBase } from './DemoKnowledgeBase';
import { DemoGuide } from './DemoGuide';

const screens = ['Chat', 'Knowledge base', 'How RAG works'] as const;

const suggestions = demoIncidents.slice(0, 4).map(({ id, title, category }) => ({
  id, title, category, query: `How was this resolved? ${title}`,
}));

export function DemoChat({ modelName }: { modelName: string }) {
  const [screen, setScreen] = useState<typeof screens[number]>('Chat');
  const [conversation, setConversation] = useState(0);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  return (
    <main className="flex h-dvh min-h-0 flex-col bg-white text-slate-950 dark:bg-[#211d2b] dark:text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6 dark:border-white/10">
        <div className="flex items-center gap-3">
          <Shield aria-hidden="true" className="size-6 text-violet-600 dark:text-violet-300" />
          <div>
            <p className="font-semibold">TriageRAG demo</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">Sample incidents · Chats reset on refresh</p>
          </div>
        </div>
        <button type="button" onClick={() => {
          setScreen('Chat');
          setConversation((current) => current + 1);
          setEvidenceOpen(false);
        }} className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm font-medium hover:bg-violet-500/10 focus-visible:outline-2 focus-visible:outline-violet-500 dark:border-white/15">
          New chat
        </button>
      </header>
      <nav aria-label="Demo navigation" className="flex shrink-0 flex-wrap gap-x-4 border-b border-slate-200 px-4 sm:gap-x-6 sm:px-6 dark:border-white/10">
        {screens.map((item) => (
          <button key={item} type="button" aria-current={screen === item ? 'page' : undefined}
            onClick={() => setScreen(item)}
            className={`min-h-11 border-b-2 px-1 text-sm font-medium focus-visible:outline-2 focus-visible:outline-violet-500 ${screen === item ? 'border-violet-600 text-violet-700 dark:border-violet-400 dark:text-violet-300' : 'border-transparent text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'}`}>
            {item}
          </button>
        ))}
      </nav>
      <div hidden={screen !== 'Chat'} className={screen === 'Chat' ? 'flex min-h-0 flex-1' : undefined}>
        <ChatInterface
          key={conversation}
          demoIncidents={demoIncidents}
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
