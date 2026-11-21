'use client';

import React, { useState } from 'react';
import { Webhook, CheckCircle2, AlertCircle, Plus, Send, Shield } from 'lucide-react';
import { testIntegration, saveIntegration } from '@/app/actions';
import type { Integration } from '@/db/schema';
import type { AuthContext } from '@/lib/auth';

interface Props {
  auth: AuthContext;
  integrations: Integration[];
}

export function IntegrationsView({ auth, integrations }: Props) {
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ id: number; message: string; success: boolean } | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('slack');
  const [webhookUrl, setWebhookUrl] = useState('');

  const handleTest = async (id: number, url: string, intType: string) => {
    setTestingId(id);
    const res = await testIntegration(url, intType);
    setTestResult({ id, message: res.message, success: res.success });
    setTestingId(null);
    setTimeout(() => setTestResult(null), 5000);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveIntegration({
      name,
      type,
      webhookUrl,
      enabled: true,
      events: ['incident_ingested', 'critical_triage'],
    });
    setName('');
    setWebhookUrl('');
    setIsAddOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#212121]">
      <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Webhook className="h-5 w-5 text-indigo-500" />
            <h1 className="text-base font-bold text-slate-900 dark:text-white">Enterprise Integrations & Webhooks</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Dispatch triage alerts and incident ingestion events to Slack, Teams, and PagerDuty in {auth.org.name}
          </p>
        </div>

        {auth.isAdmin && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Integration
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {testResult && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
            }`}
          >
            {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span>{testResult.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold uppercase text-xs">
                    {item.type.slice(0, 2)}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      item.enabled
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-100 dark:bg-white/10 text-slate-400'
                    }`}
                  >
                    {item.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">{item.name}</h3>
                <p className="font-mono text-[11px] text-slate-400 truncate mb-4">{item.webhookUrl}</p>

                <div className="space-y-1 mb-5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Subscribed Events
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {JSON.parse(item.events || '[]').map((ev: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 font-mono text-[10px] text-slate-600 dark:text-slate-300"
                      >
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-mono">HMAC SHA256 Signature</span>
                <button
                  onClick={() => handleTest(item.id, item.webhookUrl, item.type)}
                  disabled={testingId === item.id}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Send className="h-3 w-3" />
                  {testingId === item.id ? 'Pinging...' : 'Test Webhook'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-slate-200 dark:border-white/10 max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-4">Add Enterprise Webhook</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Name / Channel
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Slack (#prod-incidents)"
                  className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Platform
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#171717] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="slack">Slack Incoming Webhook</option>
                  <option value="teams">Microsoft Teams Connector</option>
                  <option value="pagerduty">PagerDuty Event API v2</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs"
                >
                  Save Integration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
