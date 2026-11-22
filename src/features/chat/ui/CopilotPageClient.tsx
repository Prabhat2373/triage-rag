'use client';

import { useEffect, useState } from 'react';
import type { IncidentSuggestionState } from '../retrieval/suggestions';
import { ChatHistorySkeleton } from './ChatHistorySkeleton';
import { ChatInterface } from './ChatInterface';
import { useDashboard } from '@/components/layout/DashboardContext';
import { getSessionMessagesAction } from '@/features/chat/actions';
import { DEFAULT_CHAT_MODEL, isChatModel, type ChatModelOption } from '../models/catalog';
import type { ChatMessage, ChatSessionSummary } from '../types';

type Props = { incidentSuggestions: IncidentSuggestionState; modelOptions: ChatModelOption[] };
type History = { messages: ChatMessage[] } | { error: string };

export function CopilotPageClient(props: Props) {
  const { activeChat } = useDashboard();
  const viewKey = activeChat.kind === 'draft' ? `draft-${activeChat.version}` : `history-${activeChat.sessionId}`;
  return <ActiveConversation key={viewKey} {...props} />;
}

function ActiveConversation({ incidentSuggestions, modelOptions }: Props) {
  const {
    activeChat,
    setActiveChat,
    selectedModel,
    setSelectedModel,
    setChatSessions,
    evidenceOpen,
    setEvidenceOpen,
    setEvidenceCount,
  } = useDashboard();

  // A draft keeps the same view when its first exchange is saved.
  const [initialSessionId] = useState(activeChat.sessionId);
  const [history, setHistory] = useState<History | null>(null);

  useEffect(() => {
    if (initialSessionId === null) return;

    let cancelled = false;
    void getSessionMessagesAction(initialSessionId).then((result) => {
      if (cancelled) return;
      if (!result.success || !result.messages || !result.session) throw new Error();
      setHistory({ messages: result.messages });
      if (isChatModel(result.session.model)) setSelectedModel(result.session.model);
    }).catch(() => {
      if (!cancelled) setHistory({ error: 'Unable to load this conversation.' });
    });
    return () => {
      cancelled = true;
    };
  }, [initialSessionId, setSelectedModel]);

  function updateSession(session: ChatSessionSummary) {
    setChatSessions((sessions) => [session, ...sessions.filter(({ id }) => id !== session.id)]);
    if (activeChat.kind === 'draft' && activeChat.sessionId === null) {
      setActiveChat((current) => current === activeChat ? { ...activeChat, sessionId: session.id } : current);
    }
  }

  if (initialSessionId !== null && !history) return <ChatHistorySkeleton />;
  if (history && 'error' in history) {
    return <div className="p-6 text-sm" role="alert">{history.error}</div>;
  }

  return (
    <ChatInterface
      incidentSuggestions={incidentSuggestions}
      initialChatMessages={history?.messages ?? []}
      activeSessionId={activeChat.sessionId}
      selectedModel={modelOptions.some(({ id, available }) => id === selectedModel && available) ? selectedModel : DEFAULT_CHAT_MODEL}
      modelOptions={modelOptions}
      onSelectModel={setSelectedModel}
      onSessionUpdated={updateSession}
      evidenceOpen={evidenceOpen}
      onCloseEvidence={() => setEvidenceOpen(false)}
      onOpenEvidence={() => setEvidenceOpen(true)}
      onSetEvidenceCount={setEvidenceCount}
    />
  );
}
