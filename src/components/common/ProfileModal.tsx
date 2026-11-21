'use client';

import React, { useState } from 'react';
import { X, UserCheck } from 'lucide-react';
import { updateProfileAction } from '@/app/actions';
import type { User, Organization } from '@/db/schema';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  org: Organization;
}

export function ProfileModal({ isOpen, onClose, user, org }: Props) {
  const [profileName, setProfileName] = useState(user.name);
  const [profileAvatar, setProfileAvatar] = useState(user.avatar);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateProfileAction({ name: profileName, avatar: profileAvatar });
    setIsSaving(false);
    if (res.success) {
      setProfileStatus('Profile updated successfully!');
      setTimeout(() => {
        setProfileStatus(null);
        onClose();
      }, 1500);
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
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Account Profile & Settings</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Manage identity in {org.name}</p>
          </div>
        </div>

        {profileStatus && (
          <div className="mb-4 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs">
            {profileStatus}
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
              Display Name
            </label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
              Email (SSO Bound)
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 text-xs text-slate-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
              Avatar URL
            </label>
            <input
              type="url"
              value={profileAvatar}
              onChange={(e) => setProfileAvatar(e.target.value)}
              className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
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
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
