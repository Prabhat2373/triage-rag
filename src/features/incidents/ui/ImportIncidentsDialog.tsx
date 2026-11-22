'use client';

import { useId, useState, type FormEvent } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { importIncidentWorkbook } from '../actions';
import { INCIDENT_COLUMNS, MAX_IMPORT_BYTES, MAX_IMPORT_ROWS } from '../incident-input';

export function ImportIncidentsDialog({ onClose }: { onClose: () => void }) {
  const formId = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

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
    <Modal title="Import from Excel" description="Add resolved incidents from the first sheet of an Excel workbook." busy={pending} onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} disabled={pending} className="ui-button ui-button-quiet">{result ? 'Done' : 'Cancel'}</button>
        <button type="submit" form={formId} disabled={pending} className="ui-button ui-button-primary">
          {pending && <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" />}
          {pending ? 'Importing…' : 'Import incidents'}
        </button>
      </>}>
      <div className="mb-5 rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/5">
        <p className="text-slate-700 dark:text-slate-200">Use these column names in the first row:</p>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{INCIDENT_COLUMNS.map(({ label }) => label).join(' · ')}</p>
        <a href="/api/incidents/template" download className="mt-3 inline-flex items-center gap-1.5 font-semibold text-violet-700 hover:underline dark:text-violet-300">
          <Download aria-hidden="true" className="size-4" /> Download Excel template
        </a>
      </div>

      <form id={formId} onSubmit={submit} className="space-y-4">
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

      </form>
    </Modal>
  );
}
