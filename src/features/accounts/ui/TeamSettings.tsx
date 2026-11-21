'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import type { Organization } from '@/db/schema';
import type { WorkspaceMember } from '../team';
import { updateMemberRole } from '../settings-actions';
import { InviteMemberModal } from './InviteMemberModal';

export function TeamSettings({ members, currentUserId, organization }: {
  members: WorkspaceMember[];
  currentUserId: number;
  organization: Organization;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null);

  async function changeRole(memberId: number, role: 'admin' | 'member') {
    setPendingId(memberId);
    setFeedback(null);
    try {
      const result = await updateMemberRole(memberId, role);
      setFeedback({ error: !result.success, message: result.success ? 'Role updated.' : result.error ?? 'Unable to update the role.' });
    } catch {
      setFeedback({ error: true, message: 'Unable to update the role. Please try again.' });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="team-heading" className="text-xl font-semibold tracking-tight">Team</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Manage workspace members, invitations, and roles.</p>
        </div>
        <button type="button" onClick={() => setInviteOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-violet-700 px-3 text-sm font-semibold text-white hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500">
          <UserPlus aria-hidden="true" className="size-4" /> Invite member
        </button>
      </div>

      {feedback && <p role={feedback.error ? 'alert' : 'status'} className={`mt-4 text-sm ${feedback.error ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{feedback.message}</p>}

      <ul className="mt-5 divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-white/10 dark:border-white/10">
        {members.map((member) => {
          const isYou = member.id === currentUserId;
          const status = member.active
            ? 'Active'
            : member.hasPendingInvitation
              ? 'Invited'
              : 'Needs activation';

          return (
            <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3.5 sm:px-4">
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold">{member.name}{isYou && <span className="ml-1.5 text-xs font-normal text-zinc-500 dark:text-zinc-400">(you)</span>}</p>
                <p className="break-all text-xs text-zinc-600 dark:text-zinc-400">{member.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700 dark:bg-white/10 dark:text-zinc-300">{status}</span>
                {isYou ? (
                  <span className="px-2 text-xs font-medium">Administrator</span>
                ) : (
                  <select
                    aria-label={`Role for ${member.name}`}
                    value={member.role}
                    disabled={pendingId !== null}
                    onChange={(event) => void changeRole(member.id, event.target.value === 'admin' ? 'admin' : 'member')}
                    className="min-h-9 rounded-lg border border-zinc-200 bg-white px-2 text-xs focus-visible:outline-2 focus-visible:outline-violet-500 disabled:opacity-60 dark:border-white/15 dark:bg-[#201e28]"
                  >
                    <option value="admin">Administrator</option>
                    <option value="member">Member</option>
                  </select>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {inviteOpen && <InviteMemberModal isOpen onClose={() => setInviteOpen(false)} org={organization} />}
    </>
  );
}
