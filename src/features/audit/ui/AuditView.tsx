'use client';

import React, { useState } from 'react';
import { Shield, Search } from 'lucide-react';
import type { AuditLog } from '@/db/schema';
import type { AuthContext } from '@/features/accounts/session';

interface Props {
  auth: AuthContext;
  auditLogs: AuditLog[];
}

export function AuditView({ auth, auditLogs }: Props) {
  const [filterAction, setFilterAction] = useState('ALL');
  const [search, setSearch] = useState('');

  const actions = [...new Set(auditLogs.map(({ action }) => action))].sort();
  const labels: Record<string, string> = { CHAT_QUERY: 'Chat query', PII_SCRUBBED: 'Sensitive data redacted', TICKET_INGEST: 'Incidents added', TICKET_DELETE: 'Incident deleted', INTEGRATION_UPDATE: 'Integration updated', MEMBER_INVITED: 'Member invited', USER_LOGIN: 'Signed in', ROLE_CHANGED: 'Role changed', PASSWORD_CHANGED: 'Password changed' };
  const labelFor = (action: string) => labels[action] ?? action.toLowerCase().replaceAll('_', ' ');

  const filteredLogs = auditLogs.filter((log) => {
    const matchesAction = filterAction === 'ALL' || log.action === filterAction;
    const matchesSearch =
      log.userName.toLowerCase().includes(search.toLowerCase()) ||
      labelFor(log.action).toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase());
    return matchesAction && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#212121]">
      <div className="p-6 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-5 w-5 text-indigo-500" />
          <h1 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">Workspace activity</h1>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Review copilot activity, redaction events, and administrative changes in {auth.org.name}.
        </p>
      </div>

      <div className="p-4 border-b border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-[#1a1a1a]/50">
        <div className="relative flex-1 min-w-0 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            aria-label="Search workspace activity"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by engineer, action, details..."
            className="w-full bg-white dark:bg-[#282828] border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Filter activity by event" className="ui-field w-auto max-w-full" value={filterAction} onChange={(event) => setFilterAction(event.target.value)}>
            <option value="ALL">All events</option>
            {actions.map((action) => <option key={action} value={action}>{labelFor(action)}</option>)}
          </select>
          {(search || filterAction !== 'ALL') && <button type="button" className="ui-button ui-button-quiet" onClick={() => { setSearch(''); setFilterAction('ALL'); }}>Clear filters</button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-x-auto bg-white dark:bg-[#1a1a1a] shadow-xs">
          <table aria-label="Workspace activity" className="min-w-[640px] w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#222]">
                <th className="py-2.5 px-4 font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Timestamp</th>
                <th className="py-2.5 px-4 font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Actor</th>
                <th className="py-2.5 px-4 font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Action Event</th>
                <th className="py-2.5 px-4 font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Payload Details</th>
                <th className="py-2.5 px-4 font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-mono text-[11px]">
              {filteredLogs.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center font-sans text-sm text-slate-600 dark:text-slate-300">{auditLogs.length ? 'No events match your filters.' : 'No workspace activity yet.'}</td></tr>}
              {filteredLogs.map((log) => {
                let badgeClass = 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300';
                if (log.action === 'PII_SCRUBBED') badgeClass = 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400';
                if (log.action === 'CHAT_QUERY') badgeClass = 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400';
                if (log.action === 'TICKET_INGEST') badgeClass = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400';

                return (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-sans font-medium text-slate-900 dark:text-white">
                      {log.userName}
                      <span className="text-[10px] text-slate-400 ml-1">({log.userRole})</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-xs ${badgeClass}`}>
                        {labelFor(log.action)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-md">
                      <details><summary className="w-fit cursor-pointer font-sans text-sm font-medium text-violet-700 dark:text-violet-300">View details</summary><p className="mt-2 break-all whitespace-pre-wrap">{log.details}</p></details>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-right whitespace-nowrap">
                      {log.ipAddress}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
