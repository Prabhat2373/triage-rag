'use client';

import { useEffect, useState } from 'react';
import type { IncidentSuggestionState } from '../retrieval/suggestions';
import { ChatInterface } from './ChatInterface';
import { useDashboard } from '@/components/layout/DashboardContext';
import { getSessionMessagesAction } from '@/features/chat/actions';
import { DEFAULT_CHAT_MODEL, isChatModel, type ChatModelOption } from '../models/catalog';
import type { ChatMessage } from '../types';

type LoadedHistory = {
  sessionId: number;
  messages: ChatMessage[];
  error?: string;
};

export function CopilotPageClient({ incidentSuggestions, modelOptions }: { incidentSuggestions: IncidentSuggestionState; modelOptions: ChatModelOption[] }) {
  const {
    activeSessionId,
    selectedModel,
    setSelectedModel,
    setChatSessions,
    evidenceOpen,
    setEvidenceOpen,
    setEvidenceCount,
    setActiveSessionTitle,
  } = useDashboard();

  const [history, setHistory] = useState<LoadedHistory | null>(null);

  useEffect(() => {
    if (activeSessionId === null) return;

    let cancelled = false;
    async function loadHistory(sessionId: number) {
      try {
        const result = await getSessionMessagesAction(sessionId);
        if (cancelled) return;
        if (!result.success || !result.messages || !result.session) {
          throw new Error('Unable to load this conversation.');
        }
        setHistory({ sessionId, messages: result.messages });
        setActiveSessionTitle(result.session.title);
        if (isChatModel(result.session.model)) setSelectedModel(result.session.model);
      } catch {
        if (!cancelled) setHistory({ sessionId, messages: [], error: 'Unable to load this conversation.' });
      }
    }

    void loadHistory(activeSessionId);
    return () => {
      cancelled = true;
    };
  }, [activeSessionId, setActiveSessionTitle, setSelectedModel]);

  function updateSessionTitle(sessionId: number, title: string) {
    setActiveSessionTitle(title);
    setChatSessions((sessions) =>
      sessions.map((session) => session.id === sessionId ? { ...session, title, updatedAt: new Date() } : session)
    );
  }

  const sessionHistory = activeSessionId === history?.sessionId ? history : null;
  if (activeSessionId !== null && !sessionHistory) {
    return <div className="p-6 text-sm" role="status">Loading conversation history…</div>;
  }
  if (sessionHistory?.error) {
    return <div className="p-6 text-sm" role="alert">{sessionHistory.error}</div>;
  }

  return (
    <ChatInterface
      key={activeSessionId ?? 'unsaved'}
      incidentSuggestions={incidentSuggestions}
      initialChatMessages={sessionHistory?.messages ?? []}
      activeSessionId={activeSessionId}
      selectedModel={modelOptions.some(({ id, available }) => id === selectedModel && available) ? selectedModel : DEFAULT_CHAT_MODEL}
      modelOptions={modelOptions}
      onSelectModel={setSelectedModel}
      onSessionUpdated={updateSessionTitle}
      evidenceOpen={evidenceOpen}
      onCloseEvidence={() => setEvidenceOpen(false)}
      onOpenEvidence={() => setEvidenceOpen(true)}
      onSetEvidenceCount={setEvidenceCount}
    />
  );
}
