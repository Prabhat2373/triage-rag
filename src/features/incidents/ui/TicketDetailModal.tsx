'use client';

import React from 'react';
import { X, CheckCircle2, Copy, Check } from 'lucide-react';
import type { IncidentRecord } from '../incident-records';

interface Props {
  ticket: IncidentRecord | null;
  onClose: () => void;
}

export function TicketDetailModal({ ticket, onClose }: Props) {
  const [copied, setCopied] = React.useState(false);

  if (!ticket) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(`${ticket.title}\n\nWhat happened:\n${ticket.symptom}\n\nHow it was fixed:\n${ticket.resolution}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-slate-200 dark:border-white/10 max-w-2xl w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
            {ticket.ticketCode}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-medium">
            {ticket.category}
          </span>
        </div>

        {ticket.sourceUrl && /^https:\/\/github\.com\/[a-z0-9-]+\/[a-z0-9_.-]+\/issues\/\d+$/i.test(ticket.sourceUrl) && (
          <a href={ticket.sourceUrl} target="_blank" rel="noreferrer" className="mb-3 w-fit text-sm font-medium text-violet-700 underline dark:text-violet-300">Open original GitHub issue</a>
        )}

        <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4 pr-8">
          {ticket.title}
        </h3>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              What happened
            </span>
            <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-mono">
              {ticket.symptom}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/30">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>How it was fixed</span>
            </div>
            <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {ticket.resolution}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100 dark:border-white/5">
          <span className="text-[11px] text-slate-400 font-mono">
            Indexed into HNSW pgvector
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy incident details'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-xs transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
