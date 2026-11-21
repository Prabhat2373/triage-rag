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
        Past incidents with a similarity score above 55%.
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {sources.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-600 dark:text-slate-300">
            No matching incidents for this message.
          </div>
        ) : (
          sources.map((src, i) => (
            <div
              key={i}
              onClick={() => onSelectTicket(src.ticketCode)}
              className="p-3 rounded-xl bg-white dark:bg-[#242424] border border-slate-200/80 dark:border-white/10 shadow-2xs hover:border-indigo-400 dark:hover:border-indigo-500/50 transition cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono font-bold text-[11px] text-indigo-600 dark:text-indigo-400">
                  [{src.ticketCode}]
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                  {(src.similarity * 100).toFixed(1)}% match
                </span>
              </div>
              <h4 className="font-semibold text-xs text-slate-900 dark:text-white mb-1 group-hover:text-indigo-500 transition line-clamp-1">
                {src.title}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-2 font-mono">
                {src.symptom}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-3 w-3" />
                <span>Verified Solution Available</span>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
