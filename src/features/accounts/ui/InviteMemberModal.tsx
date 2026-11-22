'use client';

import { useId, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Copy, Mail, UserRound } from 'lucide-react';
import { TextInput } from '@/components/forms/TextInput';
import { Modal } from '@/components/ui/Modal';
import { inviteTeamMember } from '@/features/accounts/actions';
import type { Organization } from '@/db/schema';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  org: Organization;
}

export function InviteMemberModal({ isOpen, ...props }: Props) {
  return isOpen ? <InviteDialog {...props} /> : null;
}

function InviteDialog({ onClose, org }: Omit<Props, 'isOpen'>) {
  const id = useId();
  const [recipient, setRecipient] = useState<{ email: string; code: string }>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email')).trim();
    setPending(true);
    setError('');
    try {
      const result = await inviteTeamMember({
        name: String(form.get('name')).trim(), email,
        role: form.get('role') === 'admin' ? 'admin' : 'member',
      });
      if (result.success && result.code) setRecipient({ email, code: result.code });
      else setError(result.error || 'Unable to create the invitation.');
    } catch {
      setError('Unable to create the invitation. Try again.');
    } finally {
      setPending(false);
    }
  }

  async function copyInvitation() {
    if (!recipient) return;
    try {
      await navigator.clipboard.writeText(recipient.code);
      setCopyStatus('Invitation code copied.');
    } catch {
      setCopyStatus('Select the code to copy it manually.');
    }
  }

  return (
    <Modal title={recipient ? 'Invitation ready' : 'Invite a team member'} description={`Workspace: ${org.name}`} busy={pending} onClose={onClose}
      footer={<>
        {copyStatus && <span role="status" className="mr-auto text-sm">{copyStatus}</span>}
        <button type="button" onClick={onClose} disabled={pending} className="ui-button ui-button-quiet">{recipient ? 'Done' : 'Cancel'}</button>
        {recipient ? (
          <button type="button" onClick={copyInvitation} className="ui-button ui-button-primary"><Copy aria-hidden="true" className="size-4" /> Copy code</button>
        ) : (
          <button type="submit" form={id} disabled={pending} className="ui-button ui-button-primary">{pending ? 'Creating…' : 'Create invitation'}</button>
        )}
      </>}>
      {recipient ? (
        <div className="space-y-3 text-sm">
          <p className="break-words">Share this code privately with <strong>{recipient.email}</strong>. It expires after 24 hours.</p>
          <TextInput label="Invitation code" value={recipient.code} readOnly onFocus={(event) => event.currentTarget.select()} />
          <p>They can redeem it on the <Link href="/invitation" className="font-semibold text-violet-700 underline dark:text-violet-300">invitation page</Link>.</p>
        </div>
      ) : (
        <form id={id} onSubmit={invite}>
          <fieldset disabled={pending} className="space-y-4">
            {error && <p role="alert" className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-800 dark:text-rose-200">{error}</p>}
            <TextInput name="name" label="Full name" icon={UserRound} placeholder="Alex Rivera" maxLength={120} required />
            <TextInput name="email" label="Work email" type="email" icon={Mail} placeholder="alex@company.com" maxLength={254} required />
            <div>
              <label htmlFor={`${id}-role`} className="mb-1.5 block text-sm font-semibold">Workspace role</label>
              <select id={`${id}-role`} name="role" className="ui-field" aria-describedby={`${id}-role-help`}>
                <option value="member">Member</option>
                <option value="admin">Administrator</option>
              </select>
              <p id={`${id}-role-help`} className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">Members can use chat and add incidents. Administrators can also manage team access and integrations.</p>
            </div>
          </fieldset>
        </form>
      )}
    </Modal>
  );
}
