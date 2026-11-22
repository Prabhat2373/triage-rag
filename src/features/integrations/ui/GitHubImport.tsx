'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { GitFork, KeyRound } from 'lucide-react';
import { TextInput } from '@/components/forms/TextInput';
import { PasswordField } from '@/components/forms/PasswordField';

const skipLabels = {
  pullRequest: 'Pull request',
  notCompleted: 'Issue wasn’t closed as completed',
  invalidIssue: 'Missing issue details',
  noDocumentedFix: 'No fix recognized in the description or checked comments',
  commentsUnavailable: 'Comments could not be loaded',
};

type Preview = {
  scanned: number;
  skippedIssues?: { number?: number; reason: keyof typeof skipLabels }[];
  incompleteThreads?: number;
  incidents: { ticketCode: string; title: string; category: string; sourceUrl: string }[];
  imported?: number;
  updated?: number;
  skipped?: number;
};

export type GitHubConnection = { owner: string; repo: string; label: string };

export function GitHubImport({ canManage, connection }: { canManage: boolean; connection?: GitHubConnection }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [savedConnection, setSavedConnection] = useState(connection);
  const [preview, setPreview] = useState<Preview>();
  const [error, setError] = useState('');
  const [pending, setPending] = useState<'connect' | 'import'>();
  const [token, setToken] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const action = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'import' ? 'import' : 'connect';
    const settings = { owner: String(form.get('owner')).trim(), repo: String(form.get('repo')).trim(), label: String(form.get('label')).trim() };
    setError('');
    setPending(action);

    try {
      const response = await fetch('/api/integrations/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings, token, action, issueNumber: String(form.get('issueNumber')).trim(),
          codes: preview?.incidents.map(({ ticketCode }) => ticketCode),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to connect to GitHub.');
      setPreview(result);
      if (action === 'connect') setSavedConnection(settings);
      if (action === 'import') {
        setToken('');
        router.refresh();
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to connect to GitHub.');
    } finally {
      setPending(undefined);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-white/12 dark:bg-[#24212e]" aria-labelledby="github-import-title">
      <div className="flex flex-wrap items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-200"><GitFork aria-hidden="true" className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <h2 id="github-import-title" className="text-base font-semibold">GitHub Issues</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Import closed issues with documented fixes into your knowledge base.</p>
          {savedConnection && <p className="mt-1 break-all text-xs font-medium text-violet-700 dark:text-violet-300">Configured repository: {savedConnection.owner}/{savedConnection.repo}</p>}
          {!canManage && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Ask a workspace administrator to connect GitHub and import issues.</p>}
        </div>
        {canManage && (
          <button type="button" disabled={Boolean(pending)} aria-expanded={open} aria-controls="github-setup" onClick={() => {
            setOpen(!open);
            setPreview(undefined);
            setError('');
            setToken('');
          }} className="min-h-10 rounded-xl bg-violet-700 px-3 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-60">
            {open ? 'Close setup' : savedConnection ? 'Manage GitHub' : 'Connect GitHub'}
          </button>
        )}
      </div>

      {canManage && open && (
        <form id="github-setup" onSubmit={submit} onChange={() => { setPreview(undefined); setError(''); }} className="mt-5 max-w-2xl space-y-4">
          <fieldset disabled={Boolean(pending)} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput name="owner" defaultValue={savedConnection?.owner} label="Repository owner" placeholder="e.g. acme-engineering" maxLength={39} required />
              <TextInput name="repo" defaultValue={savedConnection?.repo} label="Repository name" placeholder="e.g. checkout-service" maxLength={100} required />
            </div>
            <TextInput name="label" defaultValue={savedConnection?.label} label="Issue label (optional)" placeholder="e.g. incident" maxLength={50} />
            <TextInput name="issueNumber" label="Issue number (optional)" inputMode="numeric" placeholder="e.g. 150395" maxLength={16}
              hint="Preview one issue directly, regardless of its age or label. Leave blank to preview recent closed issues." />
            <PasswordField
              label="GitHub access token (private repos)"
              icon={KeyRound}
              placeholder="github_pat_…"
              autoComplete="off"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              maxLength={260}
              hint="Leave blank for public repositories. The token is used for this import and isn’t saved."
            />
          </fieldset>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Use a <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer" className="font-semibold text-violet-700 underline dark:text-violet-300">fine-grained token</a> for the selected repository with <strong>Issues: Read-only</strong>. Imported issue content is available to members of this TriageRAG workspace.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">Open issues aren’t imported. After documenting the fix and closing the issue as completed, run the preview again. Without an issue number, the preview checks up to 30 recently updated closed issues. A fix can be documented in the description or in a comment describing what worked. A comment like “Fixed by rolling back the deployment” works without a heading.</p>
          {error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}
          {preview && (
            <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-white/10">
              <p role="status" className="font-semibold">{preview.scanned === 0 ? 'No closed issues matched this repository and label.' : `${preview.incidents.length} of ${preview.scanned} GitHub results are ready to import.`}</p>
              {Boolean(preview.incompleteThreads) && (
                <p className="mt-1 text-amber-800 dark:text-amber-300">Couldn’t read comments on {preview.incompleteThreads} of the closed issues. Try again or preview one issue by number.</p>
              )}
              {preview.scanned > 0 && preview.incidents.length === 0 && (
                <p className="mt-1 text-slate-600 dark:text-slate-300">Try an issue number from a thread that explains how the issue was fixed.</p>
              )}
              {Boolean(preview.skippedIssues?.length) && (
                <details className="mt-2">
                  <summary className="cursor-pointer font-medium text-violet-700 dark:text-violet-300">Why results were skipped ({preview.skippedIssues?.length})</summary>
                  <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto text-slate-600 dark:text-slate-300">
                    {preview.skippedIssues?.map(({ number, reason }, index) => (
                      <li key={number ?? `missing-${index}`}>{number ? `#${number} · ` : ''}{skipLabels[reason]}</li>
                    ))}
                  </ul>
                </details>
              )}
              {preview.imported !== undefined ? (
                <p className="mt-1">Added {preview.imported}, updated {preview.updated}, skipped {preview.skipped}.</p>
              ) : (
                <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto">
                  {preview.incidents.map((issue) => (
                    <li key={issue.ticketCode}><a href={issue.sourceUrl} target="_blank" rel="noreferrer" className="break-words text-violet-700 hover:underline dark:text-violet-300">{issue.title}</a> · {issue.category}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" value="connect" disabled={Boolean(pending)} className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:hover:bg-white/10">{pending === 'connect' ? 'Checking GitHub…' : 'Save connection and preview'}</button>
            {Boolean(preview?.incidents.length) && preview?.imported === undefined && (
              <button type="submit" value="import" disabled={Boolean(pending)} className="min-h-10 rounded-xl bg-violet-700 px-3 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-60">{pending === 'import' ? 'Importing…' : 'Import to knowledge base'}</button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
