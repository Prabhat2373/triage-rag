'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Mail, UserRound } from 'lucide-react';
import type { User } from '@/db/schema';
import { PasswordField } from '@/components/forms/PasswordField';
import { TextInput } from '@/components/forms/TextInput';
import { updateProfileAction } from '../actions';
import { changePassword } from '../settings-actions';
import { AVATAR_ACCEPT, avatarSizeError } from '../avatar-file';
import { AvatarDropzone } from './AvatarDropzone';

type Feedback = { success: boolean; message: string };

const submitStyle = 'min-h-10 rounded-lg bg-violet-700 px-4 text-sm font-semibold text-white hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:opacity-60';

function FormFeedback({ feedback }: { feedback: Feedback | null }) {
  if (!feedback) return null;
  return (
    <p role={feedback.success ? 'status' : 'alert'} className={`text-sm ${feedback.success ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
      {feedback.message}
    </p>
  );
}

export function ProfileSettings({ user }: { user: User }) {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [avatar, setAvatar] = useState<{ file: File; previewUrl: string } | null>(null);
  const [savedAvatar, setSavedAvatar] = useState<string>();
  const [avatarError, setAvatarError] = useState('');
  const previewUrl = avatar?.previewUrl;

  useEffect(() => {
    if (previewUrl) return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function chooseAvatar(files: FileList) {
    const file = files[0];
    setFeedback(null);
    setAvatar(null);
    if (files.length !== 1) {
      setAvatarError('Choose one image at a time.');
      return;
    }
    const sizeError = avatarSizeError(file);
    if (sizeError) {
      setAvatarError(sizeError);
      return;
    }
    const formats = AVATAR_ACCEPT.split(',');
    if (!formats.includes(file.type) && !(file.type === '' && /\.(jpe?g|png|webp)$/i.test(file.name))) {
      setAvatarError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    setAvatarError('');
    setAvatar({ file, previewUrl: URL.createObjectURL(file) });
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (avatar) form.set('avatar', avatar.file);
    setPending(true);
    setFeedback(null);
    try {
      const result = await updateProfileAction(form);
      if (result.success && result.avatar) {
        setSavedAvatar(result.avatar);
        setAvatar(null);
        setAvatarError('');
      }
      setFeedback({ success: result.success, message: result.success ? 'Profile saved.' : result.error ?? 'Unable to save your profile.' });
    } catch {
      setFeedback({ success: false, message: 'Unable to save your profile. Please try again.' });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={saveProfile} className="mt-5 max-w-xl space-y-4">
      <TextInput name="name" label="Display name" icon={UserRound} autoComplete="name" defaultValue={user.name} maxLength={120} required />
      <TextInput label="Work email" type="email" icon={Mail} value={user.email} readOnly />
      <AvatarDropzone
        currentAvatar={savedAvatar ?? user.avatar}
        previewUrl={previewUrl}
        fileName={avatar?.file.name}
        error={avatarError}
        disabled={pending}
        onSelect={chooseAvatar}
        onClear={() => { setAvatar(null); setAvatarError(''); }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={submitStyle}>{pending ? 'Saving…' : 'Save profile'}</button>
        <FormFeedback feedback={feedback} />
      </div>
    </form>
  );
}

export function SecuritySettings() {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [passwordFormVersion, setPasswordFormVersion] = useState(0);

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get('newPassword'));
    if (newPassword !== form.get('confirmation')) {
      setFeedback({ success: false, message: 'The new passwords do not match.' });
      return;
    }

    setPending(true);
    setFeedback(null);
    try {
      const result = await changePassword(String(form.get('currentPassword')), newPassword);
      setFeedback({ success: result.success, message: result.success ? 'Password changed. Other sessions were signed out.' : result.error ?? 'Unable to change your password.' });
      if (result.success) setPasswordFormVersion((version) => version + 1);
    } catch {
      setFeedback({ success: false, message: 'Unable to change your password. Please try again.' });
    } finally {
      setPending(false);
    }
  }

  return (
    <form key={passwordFormVersion} onSubmit={savePassword} className="mt-5 max-w-xl space-y-4">
      <PasswordField name="currentPassword" label="Current password" autoComplete="current-password" required />
      <PasswordField name="newPassword" label="New password" hint="Use at least 12 characters." autoComplete="new-password" minLength={12} maxLength={128} required />
      <PasswordField name="confirmation" label="Confirm new password" autoComplete="new-password" minLength={12} maxLength={128} required />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={submitStyle}>{pending ? 'Updating…' : 'Change password'}</button>
        <FormFeedback feedback={feedback} />
      </div>
    </form>
  );
}
