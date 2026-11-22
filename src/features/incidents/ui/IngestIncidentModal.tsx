'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Formik, type FormikErrors } from 'formik';
import { CheckCircle2, FilePlus2, Hash, LoaderCircle, ShieldCheck, Tag, X } from 'lucide-react';
import { TextInput } from '@/components/forms/TextInput';
import { createResolvedTicket } from '../actions';
import { INCIDENT_COLUMNS, type IncidentInput, validateIncidentField } from '../incident-input';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orgName: string;
}

const initialValues: IncidentInput = { ticketCode: '', category: '', title: '', symptom: '', resolution: '' };

const descriptions = {
  symptom: 'Checkout requests timed out for some customers during a traffic spike.',
  resolution: 'Restarted the affected service, increased the connection pool, and verified checkout recovered.',
};

function validate(values: IncidentInput): FormikErrors<IncidentInput> {
  const errors: FormikErrors<IncidentInput> = {};
  for (const field of INCIDENT_COLUMNS) {
    const error = validateIncidentField(field, values[field.key]);
    if (error) errors[field.key] = error;
  }
  return errors;
}

export function IngestIncidentModal({ isOpen, ...props }: Props) {
  return isOpen ? <IncidentDialog {...props} /> : null;
}

function IncidentDialog({ onClose, orgName }: Omit<Props, 'isOpen'>) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [savedCode, setSavedCode] = useState<string>();

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    element?.querySelector<HTMLInputElement>('input')?.focus();
    return () => { element?.close(); };
  }, []);

  return (
    <Formik
      initialValues={initialValues}
      validate={validate}
      onSubmit={async (values, { setStatus }) => {
        setStatus(undefined);
        const data = new FormData();
        for (const { key } of INCIDENT_COLUMNS) data.set(key, values[key].trim());

        try {
          const result = await createResolvedTicket(data);
          if (result.success) setSavedCode(result.ticketCode);
          else setStatus(result.error);
        } catch {
          setStatus('Couldn’t save the incident. Your entries are still here. Try again.');
        }
      }}
    >
      {({ handleSubmit, getFieldProps, getFieldMeta, isSubmitting, status }) => (
        <dialog
          ref={dialog}
          aria-labelledby={titleId}
          onCancel={(event) => {
            event.preventDefault();
            if (!isSubmitting) onClose();
          }}
          className="ui-dialog"
        >
          <form noValidate onSubmit={handleSubmit} className="ui-dialog-layout">
            <header className="flex shrink-0 items-start gap-3 border-b border-slate-200 px-4 py-4 sm:px-6 dark:border-white/10">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-200">
                <FilePlus2 aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-lg font-semibold tracking-tight">Add resolved incident</h2>
                <p className="break-words text-sm text-slate-600 dark:text-slate-300">Save what happened and how it was fixed in {orgName.trim().replace(/\.+$/, '')}.</p>
              </div>
              <button type="button" onClick={onClose} disabled={isSubmitting} aria-label="Close add incident form" className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-violet-500 disabled:opacity-50 dark:hover:bg-white/10">
                <X aria-hidden="true" className="size-4" />
              </button>
            </header>

            <div className="ui-dialog-body">
              {savedCode ? (
                <div role="status" className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-400/10 dark:text-emerald-200">
                  <CheckCircle2 aria-hidden="true" className="size-5 shrink-0" />
                  <div><p className="font-semibold">Incident saved</p><p className="mt-1 break-all">{savedCode} is now in your knowledge base.</p></div>
                </div>
              ) : (
                <fieldset disabled={isSubmitting} className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                  {INCIDENT_COLUMNS.map(({ key, label, maxLength }) => {
                    const { value, touched, error } = getFieldMeta<string>(key);
                    const message = touched ? error : undefined;
                    if (key === 'symptom' || key === 'resolution') {
                      const id = `${titleId}-${key}`;
                      return (
                        <div key={key} className="min-w-0 sm:col-span-2">
                          <div className="mb-1.5 flex items-baseline justify-between gap-2">
                            <label htmlFor={id} className="text-sm font-semibold">{label}</label>
                            <span aria-hidden="true" className="text-xs tabular-nums text-slate-600 dark:text-slate-400">{value.length}/{maxLength}</span>
                          </div>
                          <textarea
                            {...getFieldProps<string>(key)}
                            id={id}
                            rows={3}
                            required
                            maxLength={maxLength}
                            aria-invalid={message ? true : undefined}
                            aria-describedby={message ? `${id}-error` : undefined}
                            placeholder={descriptions[key]}
                            className={`block min-h-22 w-full resize-y rounded-xl border bg-white px-3.5 py-2.5 text-sm leading-6 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500/25 dark:bg-[#191722] dark:placeholder:text-slate-400 ${message ? 'border-rose-500/70' : 'border-zinc-200 focus:border-violet-500 dark:border-white/12'}`}
                          />
                          {message && <p id={`${id}-error`} className="mt-1 text-xs text-rose-700 dark:text-rose-300">{message}</p>}
                        </div>
                      );
                    }

                    return (
                      <div key={key} className={key === 'title' ? 'sm:col-span-2' : undefined}>
                        <TextInput
                          {...getFieldProps<string>(key)}
                          label={key === 'title' ? 'Incident title' : label}
                          icon={key === 'ticketCode' ? Hash : key === 'category' ? Tag : undefined}
                          placeholder={key === 'ticketCode' ? 'TKT-1026' : key === 'category' ? 'Payments' : 'Checkout timed out during peak traffic'}
                          maxLength={maxLength}
                          autoComplete="off"
                          required
                          error={message}
                        />
                      </div>
                    );
                  })}
                </fieldset>
              )}
            </div>

            <footer className="shrink-0 border-t border-slate-200 bg-slate-50/70 px-4 py-3 sm:px-6 dark:border-white/10 dark:bg-white/5">
              {status && <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">{status}</p>}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {!savedCode && <p className="flex max-w-xs items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300"><ShieldCheck aria-hidden="true" className="size-4 shrink-0 text-violet-700 dark:text-violet-300" /> Leave out passwords, access keys, and personal information.</p>}
                <div className="ml-auto flex items-center gap-2">
                  <button type="button" onClick={onClose} disabled={isSubmitting} className="min-h-10 rounded-lg px-3 text-sm font-medium hover:bg-slate-200/70 focus-visible:outline-2 focus-visible:outline-violet-500 disabled:opacity-50 dark:hover:bg-white/10">
                    {savedCode ? 'Done' : 'Cancel'}
                  </button>
                  {!savedCode && (
                    <button type="submit" disabled={isSubmitting} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-violet-700 px-3.5 text-sm font-semibold text-white hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:opacity-60">
                      {isSubmitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
                      {isSubmitting ? 'Saving…' : 'Save incident'}
                    </button>
                  )}
                </div>
              </div>
            </footer>
          </form>
        </dialog>
      )}
    </Formik>
  );
}
