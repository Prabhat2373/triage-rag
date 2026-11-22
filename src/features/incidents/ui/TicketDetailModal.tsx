'use client';

import { useState } from 'react';
import { CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import type { IncidentRecord } from '../incident-records';

export function TicketDetailModal({ ticket, onClose }: { ticket: IncidentRecord | null; onClose: () => void }) {
  return ticket ? <IncidentDetails key={ticket.id} ticket={ticket} onClose={onClose} /> : null;
}

function IncidentDetails({ ticket, onClose }: { ticket: IncidentRecord; onClose: () => void }) {
  const [copyStatus, setCopyStatus] = useState('');
  const hasGitHubSource = ticket.sourceUrl && /^https:\/\/github\.com\/[a-z0-9-]+\/[a-z0-9_.-]+\/issues\/\d+$/i.test(ticket.sourceUrl);

  async function copyDetails() {
    try {
      await navigator.clipboard.writeText(`${ticket.title}\n\nWhat happened\n${ticket.symptom}\n\nHow it was fixed\n${ticket.resolution}`);
      setCopyStatus('Incident details copied.');
    } catch {
      setCopyStatus('Couldn’t copy. You can select the text and copy it manually.');
    }
  }

  return (
    <Modal title={ticket.title} description={`${ticket.ticketCode} · ${ticket.category}`} onClose={onClose}
      footer={<>
        {copyStatus && <p role="status" className="mr-auto text-sm">{copyStatus}</p>}
        <button type="button" onClick={copyDetails} className="ui-button"><Copy aria-hidden="true" className="size-4" /> Copy details</button>
        <button type="button" onClick={onClose} className="ui-button ui-button-primary">Done</button>
      </>}>
      <div className="space-y-4">
        {hasGitHubSource && <a href={ticket.sourceUrl ?? undefined} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-700 underline dark:text-violet-300">
          Open original GitHub issue <ExternalLink aria-hidden="true" className="size-3.5" />
        </a>}
        <section className="rounded-xl border border-[var(--ui-line)] bg-[var(--ui-subtle)] p-4">
          <h3 className="mb-2 font-semibold">What happened</h3>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{ticket.symptom}</p>
        </section>
        <section className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/8">
          <h3 className="mb-2 flex items-center gap-2 font-semibold"><CheckCircle2 aria-hidden="true" className="size-4 text-emerald-700 dark:text-emerald-300" /> How it was fixed</h3>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{ticket.resolution}</p>
        </section>
      </div>
    </Modal>
  );
}
