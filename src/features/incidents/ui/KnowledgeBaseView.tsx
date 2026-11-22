'use client';

import React, { useState } from 'react';
import { Database, Search, Plus, Trash2, Eye, FileSpreadsheet } from 'lucide-react';
import { deleteTicket } from '@/features/incidents/actions';
import { TicketDetailModal } from '@/features/incidents/ui/TicketDetailModal';
import { IngestIncidentModal } from '@/features/incidents/ui/IngestIncidentModal';
import { ImportIncidentsDialog } from './ImportIncidentsDialog';
import type { IncidentRecord } from '../incident-records';
import type { AuthContext } from '@/features/accounts/session';

interface Props {
  auth: AuthContext;
  tickets: IncidentRecord[];
}

export function KnowledgeBaseView({ auth, tickets }: Props) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [inspectedTicket, setInspectedTicket] = useState<IncidentRecord | null>(null);
  const [isIngestOpen, setIsIngestOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const categories = ['all', ...Array.from(new Set(tickets.map((t) => t.category)))];

  const filteredTickets = tickets.filter((t) => {
    const matchesCat = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch =
      t.ticketCode.toLowerCase().includes(search.toLowerCase()) ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.symptom.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleDelete = async (ticketId: number) => {
    if (!confirm('Are you sure you want to permanently delete this incident?')) return;
    setDeletingId(ticketId);
    setDeleteError('');
    try {
      const result = await deleteTicket(ticketId);
      if (!result.success) setDeleteError(result.error || 'Unable to delete the incident.');
    } catch {
      setDeleteError('Unable to delete the incident. Try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#212121]">
      <div className="p-6 border-b border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="h-5 w-5 text-indigo-500" />
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">Resolved incidents</h1>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {tickets.length} {tickets.length === 1 ? 'incident' : 'incidents'} in {auth.org.name}. Browse past issues and how they were fixed.
          </p>
        </div>

        {auth.canIngestTickets && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setIsImportOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium hover:bg-violet-50 dark:border-white/15 dark:hover:bg-white/10">
              <FileSpreadsheet aria-hidden="true" className="size-4 text-violet-600 dark:text-violet-300" />
              Import Excel
            </button>
            <button type="button" onClick={() => setIsIngestOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-700 px-3 text-sm font-semibold text-white hover:bg-violet-800">
              <Plus aria-hidden="true" className="size-4" />
              Add incident
            </button>
          </div>
        )}
      </div>

      <div className="p-4 border-b border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-[#1a1a1a]/50">
        <div className="relative flex-1 min-w-0 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            aria-label="Search resolved incidents"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by incident ID, title, or what happened…"
            className="w-full bg-white dark:bg-[#282828] border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Filter incidents by category" value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className="ui-field w-auto max-w-full">
            {categories.map((category) => <option key={category} value={category}>{category === 'all' ? 'All categories' : category}</option>)}
          </select>
          {(search || selectedCategory !== 'all') && <button type="button" className="ui-button ui-button-quiet" onClick={() => { setSearch(''); setSelectedCategory('all'); }}>Clear filters</button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {deleteError && <p role="alert" className="mb-3 text-sm text-rose-700 dark:text-rose-300">{deleteError}</p>}
        <div className="border border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-[#1a1a1a] shadow-xs overflow-x-auto">
          <table aria-label="Resolved incidents" className="w-full min-w-[620px] text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#222]">
                <th className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Incident ID</th>
                <th className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Category</th>
                <th className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Title</th>
                <th className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">What happened</th>
                <th className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredTickets.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-600 dark:text-slate-300">
                  {tickets.length ? 'No incidents match your search.' : 'No incidents yet. Add one or import an Excel workbook.'}
                </td></tr>
              )}
              {filteredTickets.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                    {t.ticketCode}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                      {t.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white max-w-xs truncate">
                    {t.title}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px] max-w-sm truncate">
                    {t.symptom}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setInspectedTicket(t)}
                        className="p-1.5 text-slate-500 hover:text-indigo-500 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition cursor-pointer"
                        aria-label={`View ${t.title}`} title="View incident"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {auth.isAdmin && (
                        <button
                          onClick={() => handleDelete(t.id)}
                          disabled={deletingId === t.id}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                          aria-label={`Delete ${t.title}`} title="Delete incident"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <TicketDetailModal
        ticket={inspectedTicket}
        onClose={() => setInspectedTicket(null)}
      />

      {isImportOpen && <ImportIncidentsDialog onClose={() => setIsImportOpen(false)} />}

      <IngestIncidentModal
        isOpen={isIngestOpen}
        onClose={() => setIsIngestOpen(false)}
        orgName={auth.org.name}
      />
    </div>
  );
}
