'use client';

import React from 'react';
import { X, CheckCircle2, SlidersHorizontal } from 'lucide-react';
import type { SourceItem } from '@/features/chat/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sources: SourceItem[];
  onSelectTicket: (code: string) => void;
}

export function EvidenceInspector({ isOpen, onClose, sources, onSelectTicket }: Props) {
  if (!isOpen) return null;

  return (
    <aside className="absolute inset-y-0 right-0 z-20 flex w-full max-w-sm shrink-0 flex-col border-l border-slate-200 bg-white shadow-xl md:static md:w-80 md:shadow-none dark:border-white/10 dark:bg-[#201d29]">
      <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-indigo-500" />
          <h3 className="font-semibold text-base text-slate-900 dark:text-white">Evidence</h3>
        </div>
        <button
          type="button"
          aria-label="Close evidence"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3 text-sm text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-white/5">
        Open a related incident to see what happened and how it was fixed.
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {sources.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-600 dark:text-slate-300">
            No matching incidents for this message.
          </div>
        ) : (
          sources.map((src, index) => (
            <section key={src.ticketCode}>
              {index < 2 && <h4 className="mb-1.5 px-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">{index === 0 ? 'Most relevant' : 'Other related incidents'}</h4>}
              <button
                type="button"
                onClick={() => onSelectTicket(src.ticketCode)}
                className={`group block w-full rounded-xl border p-3 text-left shadow-2xs transition hover:border-violet-400 ${index === 0 ? 'border-violet-200 bg-violet-50/70 dark:border-violet-400/30 dark:bg-violet-400/10' : 'border-slate-200/80 bg-white dark:border-white/10 dark:bg-[#242424]'}`}
              >
                <span className="flex items-center justify-between mb-1.5">
                  <span className="font-mono font-bold text-[11px] text-indigo-600 dark:text-indigo-400">
                    [{src.ticketCode}]
                  </span>
                </span>
                <span className="font-semibold block text-sm text-slate-900 dark:text-white mb-1 group-hover:text-indigo-500 transition line-clamp-1">
                  {src.title}
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-2">
                  {src.symptom}
                </span>
                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>View resolution</span>
                </span>
              </button>
            </section>
          ))
        )}
      </div>
    </aside>
  );
}
