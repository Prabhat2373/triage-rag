'use client';

import React, { createContext, useContext, useState } from 'react';
import type { User, Organization, ChatSession } from '@/db/schema';
import type { AuthContext } from '@/lib/auth';

interface DashboardContextType {
  auth: AuthContext;
  allUsers: User[];
  allOrgs: Organization[];
  chatSessions: ChatSession[];
  setChatSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  activeSessionId: number | null;
  setActiveSessionId: (id: number | null) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  evidenceOpen: boolean;
  setEvidenceOpen: (open: boolean) => void;
  evidenceCount: number;
  setEvidenceCount: (count: number) => void;
  activeSessionTitle: string;
  setActiveSessionTitle: (title: string) => void;
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
  allUsers: User[];
  allOrgs: Organization[];
  initialChatSessions: ChatSession[];
  children: React.ReactNode;
}

export function DashboardProvider({
  auth,
  allUsers,
  allOrgs,
  initialChatSessions,
  children,
}: ProviderProps) {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(initialChatSessions);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(
    initialChatSessions.length > 0 ? initialChatSessions[0].id : null
  );
  const [selectedModel, setSelectedModel] = useState<string>('qwen3.5:4b');
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [activeSessionTitle, setActiveSessionTitle] = useState(
    initialChatSessions.length > 0 ? initialChatSessions[0].title : ''
  );

  return (
    <DashboardContext.Provider
      value={{
        auth,
        allUsers,
        allOrgs,
        chatSessions,
        setChatSessions,
        activeSessionId,
        setActiveSessionId,
        selectedModel,
        setSelectedModel,
        evidenceOpen,
        setEvidenceOpen,
        evidenceCount,
        setEvidenceCount,
        activeSessionTitle,
        setActiveSessionTitle,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
