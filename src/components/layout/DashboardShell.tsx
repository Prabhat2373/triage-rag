'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { IngestIncidentModal } from '@/features/incidents/ui/IngestIncidentModal';
import { useTheme } from '@/hooks/useTheme';
import { useDashboard } from './DashboardContext';
import { isChatModel } from '@/features/chat/models/catalog';
import { createChatSessionAction } from '@/features/chat/actions';

const pageTitles: Record<string, string> = {
  '/': 'Incident copilot',
  '/knowledge-base': 'Knowledge base',
  '/integrations': 'Integrations',
  '/observability': 'Observability',
  '/audit': 'Audit log',
};

interface Props {
  kbCount: number;
  children: React.ReactNode;
}

export function DashboardShell({ kbCount, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [ingestModalOpen, setIngestModalOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  const {
    auth,
    chatSessions,
    setChatSessions,
    activeSessionId,
    setActiveSessionId,
    selectedModel,
    setSelectedModel,
    evidenceOpen,
    setEvidenceOpen,
    evidenceCount,
    activeSessionTitle,
    setActiveSessionTitle,
  } = useDashboard();

  const handleNewChat = async () => {
    setMobileSidebarOpen(false);
    if (pathname !== '/') {
      router.push('/');
    }
    try {
      const res = await createChatSessionAction('New Triage Session', selectedModel);
      if (res.success && res.session) {
        const session = res.session;
        setChatSessions((prev) => [session, ...prev]);
        setActiveSessionId(session.id);
        setActiveSessionTitle('New Triage Session');
      }
    } catch {
      setActiveSessionId(null);
    }
  };

  const handleSelectSession = (id: number) => {
    setMobileSidebarOpen(false);
    setActiveSessionId(id);
    const found = chatSessions.find((s) => s.id === id);
    if (found) {
      setActiveSessionTitle(found.title);
      if (isChatModel(found.model)) setSelectedModel(found.model);
    }
    if (pathname !== '/') {
      router.push('/');
    }
  };

  return (
    <div className="flex h-dvh w-full bg-[#f8f7fc] dark:bg-[#181620] text-slate-800 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-200">
      {mobileSidebarOpen && (
        <button type="button" aria-label="Close workspace navigation" onClick={() => setMobileSidebarOpen(false)} className="fixed inset-0 z-30 bg-slate-950/45 lg:hidden" />
      )}
      <div className={`h-full shrink-0 ${sidebarOpen ? 'lg:block' : 'lg:hidden'} ${mobileSidebarOpen ? 'fixed inset-y-0 left-0 z-40 shadow-xl lg:static lg:shadow-none' : 'hidden'}`}>
        <AppSidebar
          auth={auth}
          chatSessions={chatSessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onSessionDeleted={(id) => {
            setChatSessions((sessions) => sessions.filter((session) => session.id !== id));
            if (activeSessionId === id) {
              setActiveSessionId(null);
              setActiveSessionTitle('');
              setEvidenceOpen(false);
            }
          }}
          onCloseSidebar={() => {
            if (mobileSidebarOpen) setMobileSidebarOpen(false);
            else setSidebarOpen(false);
          }}
          onNavigate={() => setMobileSidebarOpen(false)}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          kbCount={kbCount}
        />
      </div>

      <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader
          sidebarOpen={sidebarOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
          mobileSidebarOpen={mobileSidebarOpen}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          title={pageTitles[pathname] ?? 'Account settings'}
          subtitle={pathname === '/' && activeSessionTitle ? activeSessionTitle : auth.org.name}
          incidentCount={kbCount}
          onOpenIngest={() => setIngestModalOpen(true)}
          evidenceCount={evidenceCount}
          onToggleEvidence={pathname === '/' ? () => setEvidenceOpen(!evidenceOpen) : undefined}
          evidenceOpen={evidenceOpen}
        />

        <main className="flex-1 flex overflow-hidden relative">
          {children}
        </main>
      </div>

      <IngestIncidentModal
        isOpen={ingestModalOpen}
        onClose={() => setIngestModalOpen(false)}
        orgName={auth.org.name}
      />
    </div>
  );
}
