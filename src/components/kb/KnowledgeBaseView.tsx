'use client';

import React, { useState } from 'react';
import { Database, Search, Plus, Trash2, Eye, Shield } from 'lucide-react';
import { deleteTicket } from '@/app/actions';
import { TicketDetailModal } from '@/components/common/TicketDetailModal';
import { IngestIncidentModal } from '@/components/common/IngestIncidentModal';
import type { Ticket } from '@/db/schema';
import type { AuthContext } from '@/lib/auth';

interface Props {
  auth: AuthContext;
  tickets: Ticket[];
}

export function KnowledgeBaseView({ auth, tickets }: Props) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [inspectedTicket, setInspectedTicket] = useState<Ticket | null>(null);
  const [isIngestOpen, setIsIngestOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const categories = ['all', ...Array.from(new Set(tickets.map((t) => t.category)))];

  const filteredTickets = tickets.filter((t) => {
    const matchesCat = selectedCategory === 'all' || t.category.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesSearch =
      t.ticketCode.toLowerCase().includes(search.toLowerCase()) ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.symptom.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleDelete = async (ticketId: number) => {
    if (!confirm('Are you sure you want to permanently delete this post-mortem?')) return;
    setDeletingId(ticketId);
    await deleteTicket(ticketId);
    setDeletingId(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#212121]">
      <div className="p-6 border-b border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="h-5 w-5 text-indigo-500" />
            <h1 className="text-base font-bold text-slate-900 dark:text-white">Knowledge Base & Post-Mortems</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {tickets.length} resolved production incidents indexed with pgvector HNSW in {auth.org.name}
          </p>
        </div>

        <button
          onClick={() => setIsIngestOpen(true)}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Ingest Post-Mortem
        </button>
      </div>

      <div className="p-4 border-b border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-[#1a1a1a]/50">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticket code, error traces, symptoms..."
            className="w-full bg-white dark:bg-[#282828] border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {categories.slice(0, 6).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-white dark:bg-[#282828] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-[#1a1a1a] shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#222]">
                <th className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Ticket</th>
                <th className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Category</th>
                <th className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Incident Summary</th>
                <th className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Observed Symptom</th>
                <th className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
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
                        title="Inspect post-mortem"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {auth.isAdmin && (
                        <button
                          onClick={() => handleDelete(t.id)}
                          disabled={deletingId === t.id}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                          title="Delete incident"
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

      <IngestIncidentModal
        isOpen={isIngestOpen}
        onClose={() => setIsIngestOpen(false)}
        orgName={auth.org.name}
      />
    </div>
  );
}
