'use client';

import React, { useId, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { TextInput } from '@/components/forms/TextInput';
import { GitHubImport, type GitHubConnection } from './GitHubImport';
import { Webhook, CheckCircle2, AlertCircle, Plus, Send } from 'lucide-react';
import { testIntegration, saveIntegration } from '@/features/integrations/actions';
import type { Integration } from '@/db/schema';
import type { AuthContext } from '@/features/accounts/session';

interface Props {
  githubConnection?: GitHubConnection;
  auth: AuthContext;
  integrations: Pick<Integration, 'id' | 'type' | 'name' | 'enabled' | 'events'>[];
}

export function IntegrationsView({ auth, integrations, githubConnection }: Props) {
  const formId = useId();
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ id: number; message: string; success: boolean } | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('slack');
  const [webhookUrl, setWebhookUrl] = useState('');

  const handleTest = async (id: number) => {
    setTestingId(id);
    try {
      const res = await testIntegration(id);
      setTestResult({ id, message: res.message, success: res.success });
    } catch {
      setTestResult({ id, message: 'The test could not finish. Try again.', success: false });
    } finally {
      setTestingId(null);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      const result = await saveIntegration({ name, type, webhookUrl, enabled: true, events: ['incident_ingested', 'critical_triage'] });
      if (!result.success) {
        setSaveError(result.error || 'Unable to save the webhook.');
        return;
      }
      setName('');
      setWebhookUrl('');
      setType('slack');
      setIsAddOpen(false);
    } catch {
      setSaveError('Unable to save the webhook. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#212121]">
      <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Webhook className="h-5 w-5 text-indigo-500" />
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">Connected tools</h1>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Connect incident sources and send workspace notifications for {auth.org.name}.
          </p>
        </div>

        {auth.isAdmin && (
          <button
            onClick={() => { setSaveError(''); setIsAddOpen(true); }}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add webhook
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <GitHubImport canManage={auth.canManageIntegrations} connection={githubConnection} />
        <h2 className="pt-2 text-base font-semibold">Notification webhooks</h2>
        {integrations.length === 0 && <p className="rounded-xl border border-dashed border-[var(--ui-line)] p-4 text-sm text-slate-600 dark:text-slate-300">No webhooks connected yet.</p>}
        {testResult && (
          <div role={testResult.success ? 'status' : 'alert'}
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

                <h3 className="font-semibold text-base text-slate-900 dark:text-white mb-1">{item.name}</h3>

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
                {auth.canManageIntegrations && <button
                  onClick={() => handleTest(item.id)}
                  disabled={testingId === item.id}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Send className="h-3 w-3" />
                  {testingId === item.id ? 'Pinging...' : 'Test Webhook'}
                </button>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {isAddOpen && (
        <Modal title="Add a webhook" description="Send notifications to a tool your team uses." busy={saving}
          onClose={() => setIsAddOpen(false)}
          footer={<>
            <button type="button" disabled={saving} onClick={() => setIsAddOpen(false)} className="ui-button ui-button-quiet">Cancel</button>
            <button type="submit" form={formId} disabled={saving} className="ui-button ui-button-primary">{saving ? 'Saving…' : 'Save webhook'}</button>
          </>}>
          <form id={formId} onSubmit={handleAdd}>
            <fieldset disabled={saving} className="space-y-4">
              {saveError && <p role="alert" className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-800 dark:text-rose-200">{saveError}</p>}
              <TextInput label="Webhook name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Production alerts" required />
              <div>
                <label htmlFor={`${formId}-platform`} className="mb-1.5 block text-sm font-semibold">Platform</label>
                <select id={`${formId}-platform`} value={type} onChange={(event) => setType(event.target.value)} className="ui-field">
                  <option value="slack">Slack</option>
                  <option value="teams">Microsoft Teams</option>
                  <option value="pagerduty">PagerDuty (simulated)</option>
                </select>
              </div>
              <TextInput label="Webhook URL" type="url" value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)}
                placeholder="https://…" hint="Paste the HTTPS webhook URL from the selected platform." required />
            </fieldset>
          </form>
        </Modal>
      )}
    </div>
  );
}
