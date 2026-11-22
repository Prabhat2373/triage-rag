'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({ title, description, children, footer, onClose, busy = false }: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); };
  }, []);

  return (
    <dialog ref={ref} aria-labelledby={id} aria-describedby={description ? `${id}-description` : undefined}
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} className="ui-dialog">
      <div className="ui-dialog-layout">
        <header className="ui-dialog-header">
          <div className="min-w-0">
            <h2 id={id} className="break-words text-lg font-semibold tracking-tight">{title}</h2>
            {description && <p id={`${id}-description`} className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p>}
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close dialog" className="ui-button ui-button-quiet size-10 shrink-0 p-0">
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>
        <div className="ui-dialog-body">{children}</div>
        {footer && <footer className="ui-dialog-footer">{footer}</footer>}
      </div>
    </dialog>
  );
}
