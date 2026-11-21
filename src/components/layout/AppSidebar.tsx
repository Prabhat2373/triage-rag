'use client';

import React, { useTransition } from 'react';
import Link from 'next/link';
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
import {
  switchUserAccount,
  logoutAction,
  deleteChatSessionAction,
} from '@/app/actions';
import type { User, Organization, ChatSession } from '@/db/schema';
import type { AuthContext } from '@/lib/auth';

interface Props {
  auth: AuthContext;
  allUsers: User[];
  allOrgs: Organization[];
  chatSessions: ChatSession[];
  activeSessionId: number | null;
  onSelectSession?: (id: number) => void;
  onNewChat?: () => void;
  onCloseSidebar: () => void;
  onOpenProfile: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  kbCount: number;
}

export function AppSidebar({
  auth,
  allUsers,
  allOrgs,
  chatSessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onCloseSidebar,
  onOpenProfile,
  isDark,
  onToggleTheme,
  kbCount,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  const handleUserSwitch = (userId: number) => {
    startTransition(async () => {
      await switchUserAccount(userId);
      router.refresh();
    });
  };

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
    if (deletingId === id) return;
    setDeletingId(id);
    await deleteChatSessionAction(id);
    setDeletingId(null);
    router.refresh();
  };

  const navItems = [
    { label: 'Triage Copilot', href: '/', icon: Terminal },
    { label: 'Knowledge Base', href: '/knowledge-base', icon: Database, badge: kbCount },
    { label: 'Integrations', href: '/integrations', icon: Webhook, dot: true },
    { label: 'Observability & RAG', href: '/observability', icon: Activity },
    { label: 'Audit & Security', href: '/audit', icon: Shield },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171717] flex flex-col justify-between shrink-0 select-none transition-all duration-200 z-30 h-full overflow-hidden">
      {/* Top Fixed Area */}
      <div className="p-3 pb-2 shrink-0">
        {/* Brand & Collapse */}
        <div className="flex items-center justify-between mb-3 px-2 pt-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shrink-0 shadow-xs">
              <Shield className="h-4 w-4" />
            </div>
            <div className="truncate">
              <div className="font-bold text-xs text-slate-900 dark:text-white truncate">TriageRAG</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{auth.org.name}</div>
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
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white dark:bg-[#212121] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 text-xs font-semibold hover:border-slate-300 dark:hover:border-white/20 transition shadow-2xs cursor-pointer mb-3"
        >
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-indigo-500" />
            <span>New Triage Session</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">⌘K</span>
        </button>

        {/* Dedicated App Pages Navigation */}
        <div className="space-y-0.5">
          <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-0.5">
            Workspace
          </div>

          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-slate-200/80 dark:bg-white/10 text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-500' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                    {item.badge}
                  </span>
                )}
                {item.dot && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Middle Scrollable Section: User-Isolated Chat History */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 py-2 space-y-1 border-t border-slate-200 dark:border-white/10">
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-1">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span>Your Chat History</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 font-mono">
            {chatSessions.length}
          </span>
        </div>

        {chatSessions.length === 0 ? (
          <div className="px-2 py-4 text-center text-[11px] text-slate-400 dark:text-slate-500 italic">
            No past chats for {auth.user.name.split(' ')[0]}
          </div>
        ) : (
          chatSessions.map((session) => {
            const isSelected = pathname === '/' && activeSessionId === session.id;
            return (
              <div
                key={session.id}
                onClick={() => {
                  if (pathname !== '/') router.push('/');
                  onSelectSession?.(session.id);
                }}
                className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition cursor-pointer ${
                  isSelected
                    ? 'bg-slate-200/90 dark:bg-white/10 text-slate-900 dark:text-white font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
                  <MessageSquare
                    className={`h-3.5 w-3.5 shrink-0 ${
                      isSelected ? 'text-indigo-500' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                    }`}
                  />
                  <span className="truncate text-[11px]">{session.title || 'Untitled Session'}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleDeleteSession(e, session.id)}
                  disabled={deletingId === session.id}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 rounded transition text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                  title="Delete chat thread"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Fixed Area: Persona Switcher & Profile */}
      <div className="p-3 border-t border-slate-200 dark:border-white/10 space-y-2 shrink-0">
        {/* Persona Switcher */}
        <div className="px-2 py-1.5 bg-white dark:bg-[#212121] rounded-xl border border-slate-200 dark:border-white/10 text-[11px]">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Account Persona
          </span>
          <select
            value={auth.user.id}
            onChange={(e) => handleUserSwitch(Number(e.target.value))}
            className="w-full bg-transparent font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer truncate"
          >
            {allUsers.map((u) => {
              const org = allOrgs.find((o) => o.id === u.orgId);
              return (
                <option key={u.id} value={u.id} className="bg-white dark:bg-[#171717] text-slate-800 dark:text-slate-200">
                  {u.name} ({u.role}) — {org?.name}
                </option>
              );
            })}
          </select>
        </div>

        {/* Profile Card */}
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition">
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer"
          >
            <img
              src={auth.user.avatar}
              alt={auth.user.name}
              className="h-8 w-8 rounded-full border border-slate-300 dark:border-slate-700 object-cover shrink-0"
            />
            <div className="truncate">
              <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {auth.user.name}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                {auth.user.role} · Settings
              </div>
            </div>
          </button>

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
