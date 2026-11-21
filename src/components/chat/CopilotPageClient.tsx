'use client';

import React, { useState, useEffect } from 'react';
import { ChatInterface } from './ChatInterface';
import { useDashboard } from '@/components/layout/DashboardContext';
import { getSessionMessagesAction } from '@/app/actions';
import type { Ticket } from '@/db/schema';
import type { ChatMessage } from './MessageItem';

interface Props {
  initialChatMessages: ChatMessage[];
  ticketsList: Ticket[];
}

export function CopilotPageClient({ initialChatMessages, ticketsList }: Props) {
  const {
    auth,
    activeSessionId,
    selectedModel,
    setSelectedModel,
    chatSessions,
    setChatSessions,
    evidenceOpen,
    setEvidenceOpen,
    setEvidenceCount,
    setActiveSessionTitle,
  } = useDashboard();

  const [messages, setMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  // When activeSessionId changes, load that session's messages
  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }

    let isCancelled = false;
    setIsLoadingSession(true);

    getSessionMessagesAction(activeSessionId).then((res) => {
      if (isCancelled) return;
      setIsLoadingSession(false);
      if (res.success && res.messages) {
        setMessages(res.messages);
        if (res.session?.title) {
          setActiveSessionTitle(res.session.title);
        }
        if (res.session?.model) {
          setSelectedModel(res.session.model);
        }
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [activeSessionId]);

  const handleSessionUpdated = (sessionId: number, newTitle: string) => {
    setActiveSessionTitle(newTitle);
    setChatSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle, updatedAt: new Date() } : s))
    );
  };

  return (
    <ChatInterface
      auth={auth}
      initialChatMessages={messages}
      ticketsList={ticketsList}
      activeSessionId={activeSessionId}
      selectedModel={selectedModel}
      onSelectModel={setSelectedModel}
      chatSessions={chatSessions}
      onSessionUpdated={handleSessionUpdated}
      evidenceOpen={evidenceOpen}
      onCloseEvidence={() => setEvidenceOpen(false)}
      onOpenEvidence={() => setEvidenceOpen(true)}
      onSetEvidenceCount={setEvidenceCount}
      isLoadingSession={isLoadingSession}
    />
  );
}
