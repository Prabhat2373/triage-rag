'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { X, Users } from 'lucide-react';
import { inviteTeamMember } from '@/features/accounts/actions';
import type { Organization } from '@/db/schema';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  org: Organization;
}

export function InviteMemberModal({ isOpen, onClose, org }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [invitationCode, setInvitationCode] = useState<string | null>(null);
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const res = await inviteTeamMember({ name, email, role });
    setIsSubmitting(false);
    if (res.success && res.code) {
      setInvitationCode(res.code);
    } else {
      setError(res.error || 'Failed to invite member');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-slate-200 dark:border-white/10 max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Invite Team Member</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Add engineers to {org.name}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}

        {invitationCode ? (
          <div className="space-y-3 text-xs">
            <p>Share this code privately with {email}. It expires after 24 hours.</p>
            <input aria-label="Invitation code" className="w-full rounded border bg-transparent p-2 font-mono" readOnly value={invitationCode} onFocus={(event) => event.currentTarget.select()} />
            <p>They can choose their password on the <Link href="/invitation" className="text-indigo-500 underline">invitation page</Link>.</p>
          </div>
        ) : <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Rivera"
              className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
              Corporate Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="engineer@acme.corp"
              className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
              Role & Permissions
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
              className="w-full bg-slate-50 dark:bg-[#171717] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="member">Member (Use copilot, add incidents)</option>
              <option value="admin">Admin (Manage Integrations, Audit, RBAC)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition"
            >
              {isSubmitting ? 'Creating invitation...' : 'Create Invitation'}
            </button>
          </div>
        </form>}
      </div>
    </div>
  );
}
