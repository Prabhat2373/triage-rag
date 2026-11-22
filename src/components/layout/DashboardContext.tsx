'use client';

import React, { createContext, useContext, useState } from 'react';
import { DEFAULT_CHAT_MODEL, isChatModel } from '@/features/chat/models/catalog';
import type { ChatSessionSummary } from '@/features/chat/types';
import type { AuthContext } from '@/features/accounts/session';

type ActiveChat =
  | { kind: 'draft'; version: number; sessionId: number | null }
  | { kind: 'history'; sessionId: number };

interface DashboardContextType {
  auth: AuthContext;
  chatSessions: ChatSessionSummary[];
  setChatSessions: React.Dispatch<React.SetStateAction<ChatSessionSummary[]>>;
  activeChat: ActiveChat;
  setActiveChat: React.Dispatch<React.SetStateAction<ActiveChat>>;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  evidenceOpen: boolean;
  setEvidenceOpen: (open: boolean) => void;
  evidenceCount: number;
  setEvidenceCount: (count: number) => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

interface ProviderProps {
  auth: AuthContext;
  initialChatSessions: ChatSessionSummary[];
  children: React.ReactNode;
}

export function DashboardProvider({
  auth,
  initialChatSessions,
  children,
}: ProviderProps) {
  const [chatSessions, setChatSessions] = useState<ChatSessionSummary[]>(initialChatSessions);
  const [activeChat, setActiveChat] = useState<ActiveChat>(() => initialChatSessions.length
    ? { kind: 'history', sessionId: initialChatSessions[0].id }
    : { kind: 'draft', version: 0, sessionId: null }
  );
  const initialModel = initialChatSessions[0]?.model;
  const [selectedModel, setSelectedModel] = useState<string>(isChatModel(initialModel) ? initialModel : DEFAULT_CHAT_MODEL);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidenceCount, setEvidenceCount] = useState(0);

  return (
    <DashboardContext.Provider
      value={{
        auth,
        chatSessions,
        setChatSessions,
        activeChat,
        setActiveChat,
        selectedModel,
        setSelectedModel,
        evidenceOpen,
        setEvidenceOpen,
        evidenceCount,
        setEvidenceCount,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
