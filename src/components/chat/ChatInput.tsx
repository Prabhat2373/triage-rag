'use client';

import React, { useRef, useEffect } from 'react';
import { ArrowUp, Sparkles, ChevronDown, Lock } from 'lucide-react';

interface Props {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (prompt?: string) => void;
  isLoading: boolean;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  orgName: string;
}

export function ChatInput({
  input,
  setInput,
  onSubmit,
  isLoading,
  selectedModel,
  onSelectModel,
  orgName,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  return (
    <div className="p-4 bg-gradient-to-t from-white via-white dark:from-[#212121] dark:via-[#212121] to-transparent shrink-0">
      <div className="max-w-3xl mx-auto w-full">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="relative flex flex-col bg-slate-100 dark:bg-[#2f2f2f] border border-slate-200/80 dark:border-white/10 rounded-3xl p-3 shadow-md focus-within:ring-1 focus-within:ring-slate-300 dark:focus-within:ring-white/20 transition"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message TriageRAG in ${orgName}...`}
            className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none resize-none px-2 max-h-40 leading-relaxed"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
              }
            }}
          />

          <div className="flex items-center justify-between pt-2 px-1">
            <div className="flex items-center gap-2">
              {/* In-box Model Switcher Pill */}
              <div className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 text-[11px] font-medium transition cursor-pointer shadow-2xs">
                <Sparkles className="h-3 w-3 text-indigo-500" />
                <span>{selectedModel}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
                <select
                  value={selectedModel}
                  onChange={(e) => onSelectModel(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                >
                  <option value="qwen3.5:4b" className="bg-white dark:bg-[#212121]">qwen3.5:4b (Default · 4B)</option>
                  <option value="llama3.2:1b" className="bg-white dark:bg-[#212121]">llama3.2:1b (Ultra-Fast · 1B)</option>
                </select>
              </div>

              <span className="hidden sm:flex items-center gap-1 font-mono text-[10px] text-slate-400">
                <Lock className="h-3 w-3 text-emerald-500" /> Air-Gapped Local
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="h-8 w-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 disabled:opacity-20 flex items-center justify-center transition cursor-pointer shadow-xs shrink-0"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
