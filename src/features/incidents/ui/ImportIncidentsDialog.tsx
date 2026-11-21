'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Download, FileSpreadsheet, LoaderCircle, X } from 'lucide-react';
import { importIncidentWorkbook } from '../actions';
import { INCIDENT_COLUMNS, MAX_IMPORT_BYTES, MAX_IMPORT_ROWS } from '../incident-input';

export function ImportIncidentsDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get('workbook');
    setError('');
    setResult(null);
    if (!(file instanceof File) || !/\.xlsx$/i.test(file.name) || !file.size || file.size > MAX_IMPORT_BYTES) {
      setError('Choose a non-empty .xlsx workbook under 750 KB.');
      return;
    }

    setPending(true);
    try {
      const response = await importIncidentWorkbook(data);
      if (response.success) {
        setResult({ imported: response.imported, skipped: response.skipped });
        form.reset();
      } else {
        setError(response.error);
      }
    } catch {
      setError('Unable to finish the import. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="import-incidents-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-2xl backdrop:bg-slate-950/55 sm:p-6 dark:border-white/10 dark:bg-[#23202c] dark:text-slate-100"
    >
      <div className="mb-4 flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-200">
          <FileSpreadsheet aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="import-incidents-title" className="text-lg font-semibold tracking-tight">Import from Excel</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">Add resolved incidents from the first sheet of an Excel workbook.</p>
        </div>
        <button type="button" onClick={onClose} disabled={pending} aria-label="Close Excel import" className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-white/10">
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div className="mb-5 rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/5">
        <p className="text-slate-700 dark:text-slate-200">Use these column names in the first row:</p>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{INCIDENT_COLUMNS.map(({ label }) => label).join(' · ')}</p>
        <a href="/api/incidents/template" download className="mt-3 inline-flex items-center gap-1.5 font-semibold text-violet-700 hover:underline dark:text-violet-300">
          <Download aria-hidden="true" className="size-4" /> Download Excel template
        </a>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="incident-workbook" className="mb-1.5 block text-sm font-semibold">Excel workbook</label>
          <input
            id="incident-workbook"
            name="workbook"
            type="file"
            aria-describedby="workbook-requirements"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={pending}
            required
            onChange={() => { setError(''); setResult(null); }}
            className="block w-full rounded-xl border border-slate-200 p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-violet-100 file:px-2.5 file:py-1.5 file:text-violet-800 dark:border-white/15 dark:file:bg-violet-400/15 dark:file:text-violet-200"
          />
          <p id="workbook-requirements" className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">.xlsx · Up to {MAX_IMPORT_ROWS} incidents · 750 KB maximum</p>
        </div>

        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
        {result && (
          <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-400/10 dark:text-emerald-200">
            Imported {result.imported} {result.imported === 1 ? 'incident' : 'incidents'}.
            {result.skipped > 0 && ` Skipped ${result.skipped} ${result.skipped === 1 ? 'duplicate ID' : 'duplicate IDs'}.`}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={pending} className="min-h-10 rounded-lg px-3 text-sm font-medium hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-white/10">
            {result ? 'Done' : 'Cancel'}
          </button>
          <button type="submit" disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-violet-700 px-3 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-60">
            {pending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
            {pending ? 'Importing…' : 'Import incidents'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
