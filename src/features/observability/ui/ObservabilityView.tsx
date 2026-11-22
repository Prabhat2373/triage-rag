'use client';

import React from 'react';
import type { ChatModelOption } from '@/features/chat/models/catalog';
import { Activity, ThumbsUp, ThumbsDown } from 'lucide-react';
import type { Evaluation } from '@/db/schema';
import type { AuthContext } from '@/features/accounts/session';

interface Props {
  auth: AuthContext;
  availableModels: ChatModelOption[];
  evaluations: Evaluation[];
  retrievalLatencies: number[];
}

export function ObservabilityView({ auth, evaluations, retrievalLatencies, availableModels }: Props) {
  const helpfulCount = evaluations.filter((e) => e.rating === 'helpful').length;
  const unhelpfulCount = evaluations.filter((e) => e.rating === 'unhelpful').length;
  const satisfactionRate =
    evaluations.length > 0 ? ((helpfulCount / evaluations.length) * 100).toFixed(1) : '—';

  const averageLatency = retrievalLatencies.length
    ? Math.round(retrievalLatencies.reduce((sum, latency) => sum + latency, 0) / retrievalLatencies.length)
    : null;
  const sortedLatencies = [...retrievalLatencies].sort((first, second) => first - second);
  const percentile95 = sortedLatencies[Math.ceil(sortedLatencies.length * 0.95) - 1];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#212121]">
      <div className="p-6 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="h-5 w-5 text-indigo-500" />
          <h1 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">Copilot performance</h1>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          See how quickly the copilot finds incidents and how useful people find the answers in {auth.org.name}.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] shadow-xs">
            <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
              Helpful answers
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-[1.625rem] font-semibold tracking-tight text-slate-950 dark:text-white">{evaluations.length ? `${satisfactionRate}%` : satisfactionRate}</span>
              <span className="text-xs text-emerald-500 font-medium">({helpfulCount} 👍 / {unhelpfulCount} 👎)</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] shadow-xs">
            <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
              Average search time
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-[1.625rem] font-semibold tracking-tight text-slate-950 dark:text-white">{averageLatency === null ? '—' : `${averageLatency} ms`}</span>
              <span className="text-xs text-slate-600 dark:text-slate-300">{percentile95 === undefined ? 'No retrieval samples' : `p95 ${percentile95} ms`}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] shadow-xs">
            <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
              Available models
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-[1.625rem] font-semibold tracking-tight text-slate-950 dark:text-white">{availableModels.length}</span>
              <span className="text-xs text-indigo-500 font-mono">{availableModels.map((model) => model.name).join(' · ')}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] shadow-xs">
            <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
              Search method
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">Semantic</span>
              <span className="text-xs text-emerald-500 font-medium">Similarity search</span>
            </div>
          </div>
        </div>

        {/* Live Human Evaluations Table */}
        <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-x-auto bg-white dark:bg-[#1a1a1a] shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
            <h3 className="font-semibold text-base text-slate-900 dark:text-white">Recent feedback</h3>
            <span className="text-[11px] text-slate-400 font-mono">{evaluations.length} records</span>
          </div>

          <table aria-label="Recent feedback" className="min-w-[650px] w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#222]">
                <th className="py-2.5 px-4 font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Rating</th>
                <th className="py-2.5 px-4 font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Model Used</th>
                <th className="py-2.5 px-4 font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Query / Answer Snippet</th>
                <th className="py-2.5 px-4 font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Match Score</th>
                <th className="py-2.5 px-4 font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider text-right">Logged At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {evaluations.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-600 dark:text-slate-300">No feedback yet. Ratings on copilot answers will appear here.</td></tr>}
              {evaluations.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition">
                  <td className="py-3 px-4 whitespace-nowrap">
                    {ev.rating === 'helpful' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                        <ThumbsUp className="h-3 w-3" /> Helpful
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[11px] font-semibold">
                        <ThumbsDown className="h-3 w-3" /> Unhelpful
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                    {ev.modelUsed}
                  </td>
                  <td className="py-3 px-4 text-slate-800 dark:text-slate-200 max-w-md truncate">
                    {ev.query}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                    {ev.similarityScore}
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px] text-right whitespace-nowrap">
                    {new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
