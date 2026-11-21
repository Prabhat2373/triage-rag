'use client';

import React, { useState, useTransition } from 'react';
import { X, Plus, Terminal } from 'lucide-react';
import { createResolvedTicket } from '@/app/actions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orgName: string;
}

export function IngestIncidentModal({ isOpen, onClose, orgName }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('Generating 768-dim embeddings with Ollama & indexing into pgvector...');
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await createResolvedTicket(formData);
      if (res.success) {
        setStatus(`✅ Successfully indexed incident ${res.ticketCode}!`);
        form.reset();
        setTimeout(() => {
          setStatus(null);
          onClose();
        }, 1500);
      } else {
        setError(res.error || 'Failed to ingest incident');
        setStatus(null);
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-slate-200 dark:border-white/10 max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Live Knowledge Base Ingestion</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Index resolved post-mortem into {orgName}</p>
          </div>
        </div>

        {status && (
          <div className="mb-4 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs flex items-center gap-2">
            <Terminal className="h-4 w-4 animate-pulse" />
            <span>{status}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Ticket Code
              </label>
              <input
                type="text"
                name="ticketCode"
                placeholder="TKT-1026"
                className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Category
              </label>
              <input
                type="text"
                name="category"
                placeholder="Networking / Cloud"
                className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
              Incident Summary / Title
            </label>
            <input
              type="text"
              name="title"
              placeholder="e.g. Istio Service Mesh 503 Service Unavailable"
              className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
              Observed Symptom & Error Traces
            </label>
            <textarea
              name="symptom"
              rows={3}
              placeholder="Inbound traffic fails with upstream connect error..."
              className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
              Verified Resolution Steps
            </label>
            <textarea
              name="resolution"
              rows={4}
              placeholder="1. Increase maxConnectionPool in VirtualService config&#10;2. Apply circuit breaker settings"
              className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[10px] text-slate-400">
              * Sensitive keys, JWTs, and PII are automatically scrubbed before vector storage.
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition"
              >
                {isPending ? 'Indexing...' : 'Index Post-Mortem'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
