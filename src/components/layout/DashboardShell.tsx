'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { ProfileModal } from '@/components/common/ProfileModal';
import { IngestIncidentModal } from '@/components/common/IngestIncidentModal';
import { useTheme } from '@/hooks/useTheme';
import { useDashboard } from './DashboardContext';
import { createChatSessionAction } from '@/app/actions';

interface Props {
  kbCount: number;
  children: React.ReactNode;
}

export function DashboardShell({ kbCount, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [ingestModalOpen, setIngestModalOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  const {
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
    activeSessionTitle,
    setActiveSessionTitle,
  } = useDashboard();

  const handleNewChat = async () => {
    if (pathname !== '/') {
      router.push('/');
    }
    try {
      const res = await createChatSessionAction('New Triage Session', selectedModel);
      if (res.success && res.session) {
        setChatSessions((prev) => [res.session!, ...prev]);
        setActiveSessionId(res.session.id);
        setActiveSessionTitle('New Triage Session');
      }
    } catch {
      setActiveSessionId(null);
    }
  };

  const handleSelectSession = (id: number) => {
    setActiveSessionId(id);
    const found = chatSessions.find((s) => s.id === id);
    if (found) {
      setActiveSessionTitle(found.title);
      if (found.model) setSelectedModel(found.model);
    }
    if (pathname !== '/') {
      router.push('/');
    }
  };

  return (
    <div className="flex h-screen w-full bg-white dark:bg-[#212121] text-slate-800 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-200">
      {sidebarOpen && (
        <AppSidebar
          auth={auth}
          allUsers={allUsers}
          allOrgs={allOrgs}
          chatSessions={chatSessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onCloseSidebar={() => setSidebarOpen(false)}
          onOpenProfile={() => setProfileModalOpen(true)}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          kbCount={kbCount}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden bg-white dark:bg-[#212121] transition-colors">
        <AppHeader
          sidebarOpen={sidebarOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          onOpenIngest={() => setIngestModalOpen(true)}
          evidenceCount={evidenceCount}
          onToggleEvidence={() => setEvidenceOpen(!evidenceOpen)}
          evidenceOpen={evidenceOpen}
          activeSessionTitle={activeSessionTitle}
          showEvidenceButton={pathname === '/'}
        />

        <main className="flex-1 flex overflow-hidden relative">
          {children}
        </main>
      </div>

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={auth.user}
        org={auth.org}
      />

      <IngestIncidentModal
        isOpen={ingestModalOpen}
        onClose={() => setIngestModalOpen(false)}
        orgName={auth.org.name}
      />
    </div>
  );
}
