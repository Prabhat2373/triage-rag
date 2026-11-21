'use client';

import React from 'react';
import { PanelLeft, ChevronDown, SlidersHorizontal, Plus, Sparkles } from 'lucide-react';

interface Props {
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  onOpenIngest: () => void;
  evidenceCount?: number;
  onToggleEvidence?: () => void;
  evidenceOpen?: boolean;
  activeSessionTitle?: string;
  showEvidenceButton?: boolean;
}

export function AppHeader({
  sidebarOpen,
  onOpenSidebar,
  selectedModel,
  onSelectModel,
  onOpenIngest,
  evidenceCount = 0,
  onToggleEvidence,
  evidenceOpen = false,
  activeSessionTitle,
  showEvidenceButton = false,
}: Props) {
  return (
    <header className="h-14 border-b border-slate-200/80 dark:border-white/10 px-4 flex items-center justify-between shrink-0 bg-white/80 dark:bg-[#212121]/80 backdrop-blur-md z-20">
      <div className="flex items-center gap-2">
        {!sidebarOpen && (
          <button
            onClick={onOpenSidebar}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer mr-1"
            title="Open sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        )}

        {/* Model Selector Pill (ChatGPT style) */}
        <div className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer">
          <span className="text-xs font-bold text-slate-800 dark:text-white">
            TriageRAG
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {selectedModel}
          </span>
          <ChevronDown className="h-3 w-3 text-slate-400" />
          <select
            value={selectedModel}
            onChange={(e) => onSelectModel(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          >
            <option value="qwen3.5:4b">qwen3.5:4b (Default · 4B)</option>
            <option value="llama3.2:1b">llama3.2:1b (Ultra-Fast · 1B)</option>
          </select>
        </div>

        {/* Active Session Title Pill */}
        {activeSessionTitle && (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-[11px] text-slate-600 dark:text-slate-300 font-medium max-w-[280px] truncate border border-slate-200/60 dark:border-white/10">
            <Sparkles className="h-3 w-3 text-indigo-500 shrink-0" />
            <span className="truncate">{activeSessionTitle}</span>
          </div>
        )}
      </div>

      {/* Right Header Actions */}
      <div className="flex items-center gap-2">
        {showEvidenceButton && onToggleEvidence && (
          <button
            onClick={onToggleEvidence}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition cursor-pointer ${
              evidenceOpen
                ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30'
                : 'bg-white dark:bg-[#212121] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Evidence Inspector ({evidenceCount})
          </button>
        )}

        <button
          onClick={onOpenIngest}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Ingest Incident
        </button>
      </div>
    </header>
  );
}
