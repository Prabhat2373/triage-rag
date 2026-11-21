'use client';

import React, { useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Shield,
  Plus,
  Terminal,
  Database,
  Webhook,
  Activity,
  PanelLeftClose,
  Clock,
  MessageSquare,
  Trash2,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';
import { logoutAction } from '@/features/accounts/actions';
import { deleteChatSessionAction } from '@/features/chat/actions';
import type { ChatSession } from '@/db/schema';
import type { AuthContext } from '@/features/accounts/session';

interface Props {
  auth: AuthContext;
  chatSessions: ChatSession[];
  activeSessionId: number | null;
  onSelectSession?: (id: number) => void;
  onNewChat?: () => void;
  onSessionDeleted: (id: number) => void;
  onCloseSidebar: () => void;
  onNavigate: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  kbCount: number;
}

export function AppSidebar({
  auth,
  chatSessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onSessionDeleted,
  onCloseSidebar,
  onNavigate,
  isDark,
  onToggleTheme,
  kbCount,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const [deleteError, setDeleteError] = React.useState('');

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
      router.push('/login');
      router.refresh();
    });
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (deletingId !== null) return;
    setDeleteError('');
    setDeletingId(id);
    try {
      const result = await deleteChatSessionAction(id);
      if (result.success) onSessionDeleted(id);
      else setDeleteError('Unable to delete this conversation.');
    } catch {
      setDeleteError('Unable to delete this conversation.');
    } finally {
      setDeletingId(null);
    }
  };

  const navItems = [
    { label: 'Incident copilot', href: '/', icon: Terminal },
    { label: 'Knowledge base', href: '/knowledge-base', icon: Database, badge: kbCount },
    { label: 'Integrations', href: '/integrations', icon: Webhook },
    { label: 'Observability', href: '/observability', icon: Activity },
    ...(auth.isAdmin ? [{ label: 'Audit log', href: '/audit', icon: Shield }] : []),
  ];

  return (
    <aside className="w-64 sm:w-68 border-r border-slate-200 dark:border-white/10 bg-[#f2eff8] dark:bg-[#1e1b28] flex flex-col justify-between shrink-0 select-none transition-all duration-200 z-30 h-full overflow-hidden">
      {/* Top Fixed Area */}
      <div className="p-3 pb-2 shrink-0">
        {/* Brand & Collapse */}
        <div className="flex items-center justify-between mb-3 px-2 pt-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-9 rounded-xl bg-violet-700 flex items-center justify-center text-white font-bold shrink-0 shadow-xs">
              <Shield className="h-4 w-4" />
            </div>
            <div className="truncate">
              <div className="font-bold text-xs text-slate-900 dark:text-white truncate">TriageRAG</div>
              <div className="text-xs text-slate-600 dark:text-slate-400 truncate">{auth.org.name}</div>
            </div>
          </div>
          <button
            onClick={onCloseSidebar}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition cursor-pointer"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {/* New Triage Chat Button */}
        <button
          onClick={() => {
            if (onNewChat) {
              onNewChat();
            } else {
              router.push('/');
            }
          }}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white dark:bg-[#212121] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 text-sm font-semibold hover:border-slate-300 dark:hover:border-white/20 transition shadow-2xs cursor-pointer mb-3"
        >
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-indigo-500" />
            <span>New chat</span>
          </div>
        </button>

        {/* Dedicated App Pages Navigation */}
        <div className="space-y-0.5">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider px-2 py-0.5">
            Workspace
          </div>

          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-violet-100 dark:bg-violet-400/15 text-violet-950 dark:text-violet-100 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-500' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="text-xs tabular-nums px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Middle Scrollable Section: User-Isolated Chat History */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 py-2 space-y-1 border-t border-slate-200 dark:border-white/10">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider px-2 py-1">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span>Recent chats</span>
          </div>
          <span className="text-xs px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 font-mono">
            {chatSessions.length}
          </span>
        </div>

        {chatSessions.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-slate-600 dark:text-slate-400">
            Your conversations will appear here.
          </div>
        ) : (
          chatSessions.map((session) => {
            const isSelected = pathname === '/' && activeSessionId === session.id;
            return (
              <div
                key={session.id}
                className={`group relative flex items-center justify-between px-2.5 py-1 rounded-xl text-sm transition ${
                  isSelected
                    ? 'bg-slate-200/90 dark:bg-white/10 text-slate-900 dark:text-white font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/5'
                }`}
              >
                <button type="button" aria-current={isSelected ? 'true' : undefined} onClick={() => onSelectSession?.(session.id)} className="flex min-h-9 min-w-0 flex-1 items-center gap-2.5 rounded-md pr-1 text-left focus-visible:outline-2 focus-visible:outline-violet-500">
                  <MessageSquare
                    className={`h-3.5 w-3.5 shrink-0 ${
                      isSelected ? 'text-indigo-500' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                    }`}
                  />
                  <span className="truncate">{session.title || 'Untitled chat'}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDeleteSession(e, session.id)}
                  disabled={deletingId === session.id}
                  className="sm:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-2 hover:text-red-500 rounded transition text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                  title="Delete chat thread"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Fixed Area: Account and profile */}
      <div className="p-3 border-t border-slate-200 dark:border-white/10 space-y-2 shrink-0">
        {deleteError && <p role="alert" className="text-xs text-red-600">{deleteError}</p>}
        {/* Profile Card */}
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition">
          <Link
            href="/settings/profile"
            onClick={onNavigate}
            aria-label="Account settings"
            aria-current={pathname.startsWith('/settings/') ? 'location' : undefined}
            className="flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer"
          >
            <Image
              unoptimized
              width={32}
              height={32}
              src={auth.user.avatar}
              alt={auth.user.name}
              className="h-8 w-8 rounded-full border border-slate-300 dark:border-slate-700 object-cover shrink-0"
            />
            <div className="truncate">
              <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {auth.user.name}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 capitalize">
                {auth.user.role} · Settings
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <button
              onClick={onToggleTheme}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition cursor-pointer"
              title="Toggle theme"
            >
              {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
