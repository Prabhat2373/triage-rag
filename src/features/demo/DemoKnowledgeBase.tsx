'use client';

import { useState } from 'react';
import { ArrowUpRight, Search } from 'lucide-react';
import { TicketDetailModal } from '@/features/incidents/ui/TicketDetailModal';
import type { IncidentRecord } from '@/features/incidents/incident-records';
import { demoIncidents } from './incidents';

const categories = [...new Set(demoIncidents.map(({ category }) => category))].sort();

export function DemoKnowledgeBase() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [selected, setSelected] = useState<IncidentRecord | null>(null);
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = demoIncidents.filter((incident) => {
    if (category && incident.category !== category) return false;
    const searchable = [incident.ticketCode, incident.title, incident.category, incident.symptom, incident.resolution].join(' ').toLowerCase();
    return words.every((word) => searchable.includes(word));
  });

  return (
    <section className="min-h-0 flex-1 overflow-y-auto" aria-labelledby="demo-knowledge-title">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-12">
        <h1 id="demo-knowledge-title" className="text-3xl font-semibold tracking-tight">Knowledge base</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          Browse the fictional incidents the demo searches. Open a record to see what happened, how the team fixed it, and how they checked the fix.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_14rem]">
          <label className="relative block">
            <span className="sr-only">Search incidents</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-4 text-slate-500 dark:text-slate-400" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by symptom, fix, or incident ID" className="h-10 w-full rounded-xl border border-slate-200 bg-transparent pl-9 pr-3 text-sm focus-visible:outline-2 focus-visible:outline-violet-500 dark:border-white/15" />
          </label>
          <label>
            <span className="sr-only">Filter by category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-violet-500 dark:border-white/15 dark:bg-[#272233]">
              <option value="">All categories</option>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        </div>

        <p role="status" className="my-4 text-sm text-slate-600 dark:text-slate-300">{matches.length} of {demoIncidents.length} incidents</p>
        {matches.length === 0 && <p className="rounded-xl border border-slate-200 p-5 text-sm dark:border-white/15">No incidents match. Try a service name or clear the category filter.</p>}
        <ul className="grid gap-3 sm:grid-cols-2">
          {matches.map((incident) => (
            <li key={incident.ticketCode}>
              <button type="button" onClick={() => setSelected(incident)} className="flex h-full w-full items-start justify-between gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-violet-400 hover:bg-violet-500/5 focus-visible:outline-2 focus-visible:outline-violet-500 dark:border-white/15 dark:hover:border-violet-400/60">
                <span>
                  <span className="block text-xs font-medium text-violet-700 dark:text-violet-300">{incident.category} · {incident.ticketCode}</span>
                  <span className="mt-1 block font-semibold">{incident.title}</span>
                  <span className="mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-300">{incident.symptom}</span>
                </span>
                <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-violet-600 dark:text-violet-300" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <TicketDetailModal ticket={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
