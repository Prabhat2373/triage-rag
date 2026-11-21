'use client';

import { useId, useState, type DragEvent } from 'react';
import Image from 'next/image';
import { Upload, X } from 'lucide-react';
import { AVATAR_ACCEPT } from '../avatar-file';

interface Props {
  currentAvatar: string;
  previewUrl?: string;
  fileName?: string;
  error: string;
  disabled: boolean;
  onSelect: (files: FileList) => void;
  onClear: () => void;
}

export function AvatarDropzone({ currentAvatar, previewUrl, fileName, error, disabled, onSelect, onClear }: Props) {
  const id = useId();
  const [dragOver, setDragOver] = useState(false);

  function isFileDrag(event: DragEvent) {
    return event.dataTransfer.types.includes('Files');
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-100">Profile photo</p>
      <div
        onDragOver={(event) => {
          if (!isFileDrag(event)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = disabled ? 'none' : 'copy';
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={(event) => {
          if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragOver(false);
        }}
        onDrop={(event) => {
          if (!isFileDrag(event)) return;
          event.preventDefault();
          setDragOver(false);
          if (!disabled) onSelect(event.dataTransfer.files);
        }}
        className={`rounded-xl border border-dashed p-3.5 transition focus-within:ring-2 focus-within:ring-violet-500/25 ${dragOver ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15' : 'border-slate-300 bg-slate-50/70 dark:border-white/20 dark:bg-white/5'}`}
      >
        <div className="flex items-center gap-3.5">
          <Image src={previewUrl ?? currentAvatar} alt={previewUrl ? 'New profile photo preview' : 'Current profile photo'} width={56} height={56} unoptimized className="size-14 shrink-0 rounded-full border border-slate-200 bg-white object-cover dark:border-white/10 dark:bg-white/10" />
          <label htmlFor={id} className={`min-w-0 flex-1 rounded-lg ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-violet-700 dark:text-violet-300">
              <Upload aria-hidden="true" className="size-4 shrink-0" /> Choose an image
            </span>
            <span className="mt-1 block text-xs text-slate-600 dark:text-slate-300">or drag and drop it here</span>
            <input
              id={id}
              type="file"
              accept={AVATAR_ACCEPT}
              disabled={disabled}
              aria-describedby={error ? `${id}-requirements ${id}-error` : `${id}-requirements`}
              aria-invalid={error ? true : undefined}
              onChange={(event) => {
                if (event.currentTarget.files?.length) onSelect(event.currentTarget.files);
                event.currentTarget.value = '';
              }}
              className="sr-only"
            />
          </label>
        </div>
      </div>
      <p id={`${id}-requirements`} className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">JPG, PNG, or WebP · Up to 750 KB</p>
      {fileName && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-violet-50 px-2.5 py-1.5 text-sm dark:bg-violet-500/10">
          <span className="truncate" role="status">{fileName} · Ready to save</span>
          <button type="button" onClick={onClear} disabled={disabled} aria-label="Discard new profile photo" className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-violet-500 disabled:opacity-60 dark:hover:bg-violet-500/20">
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      )}
      {error && <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
    </div>
  );
}
