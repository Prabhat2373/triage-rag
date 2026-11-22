'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { ChatMessage } from '../types';

export type Rating = 'helpful' | 'unhelpful';
export type SaveRating = (message: ChatMessage, rating: Rating, evaluationId?: number) => Promise<{ success: boolean; evaluationId?: number }>;

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // The Clipboard API may be unavailable on a local HTTP connection.
    const previousFocus = document.activeElement;
    const field = document.createElement('textarea');
    field.value = text;
    field.readOnly = true;
    field.style.cssText = 'position:fixed;left:0;top:0;opacity:0;pointer-events:none;';
    document.body.append(field);
    try {
      field.select();
      field.setSelectionRange(0, field.value.length);
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      field.remove();
      if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
    }
  }
}

export function MessageActions({ message, onFeedback, onOpenEvidence }: {
  message: ChatMessage;
  onFeedback: SaveRating;
  onOpenEvidence: () => void;
}) {
  const [copyStatus, setCopyStatus] = useState<'copied' | 'failed'>();
  const [savedVote, setSavedVote] = useState<{ rating: Rating; id: number }>();
  const [pendingVote, setPendingVote] = useState<Rating>();
  const [voteError, setVoteError] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saving = useRef(false);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  async function handleCopy() {
    clearTimeout(copyTimer.current);
    const copied = await copyText(message.content);
    setCopyStatus(copied ? 'copied' : 'failed');
    if (copied) copyTimer.current = setTimeout(() => setCopyStatus(undefined), 2200);
  }

  async function handleVote(rating: Rating) {
    if (saving.current || savedVote?.rating === rating) return;
    saving.current = true;
    setPendingVote(rating);
    setVoteError(false);
    try {
      const result = await onFeedback(message, rating, savedVote?.id);
      if (result.success && result.evaluationId !== undefined) setSavedVote({ rating, id: result.evaluationId });
      else setVoteError(true);
    } catch {
      setVoteError(true);
    } finally {
      saving.current = false;
      setPendingVote(undefined);
    }
  }

  const button = 'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium hover:bg-violet-500/10 focus-visible:outline-2 focus-visible:outline-violet-500 disabled:opacity-65';
  const selected = 'bg-violet-100 text-violet-800 dark:bg-violet-500/25 dark:text-violet-200';

  return (
    <div className="mt-1 pt-2 text-slate-600 dark:text-slate-300">
      <div className="flex flex-wrap items-center gap-1">
        <button type="button" onClick={handleCopy} aria-label="Copy answer" title="Copy answer" className={button}>
          {copyStatus === 'copied' ? <Check aria-hidden="true" className="size-4 text-emerald-700 dark:text-emerald-300" /> : <Copy aria-hidden="true" className="size-4" />}
          {copyStatus === 'copied' && <span role="status">Copied</span>}
        </button>
        {([
          { rating: 'helpful', label: 'Like', selectedLabel: 'Liked', icon: ThumbsUp },
          { rating: 'unhelpful', label: 'Dislike', selectedLabel: 'Disliked', icon: ThumbsDown },
        ] as const).map(({ rating, label, selectedLabel, icon: Icon }) => {
          const pressed = savedVote?.rating === rating;
          return (
            <button key={rating} type="button" aria-label={label} title={label} aria-pressed={pressed}
              disabled={Boolean(pendingVote)} onClick={() => void handleVote(rating)} className={`${button} ${pressed ? selected : ''}`}>
              <Icon aria-hidden="true" className="size-4" />
              {pendingVote === rating ? 'Saving…' : pressed ? selectedLabel : null}
            </button>
          );
        })}
        {Boolean(message.sources?.length) && (
          <button type="button" onClick={onOpenEvidence} className={`${button} text-violet-700 dark:text-violet-300`}>View evidence ({message.sources?.length})</button>
        )}
      </div>
      {copyStatus === 'failed' && <p role="alert" className="mt-1 text-xs text-rose-700 dark:text-rose-300">Couldn’t copy automatically. Select the answer to copy it manually.</p>}
      {voteError && <p role="alert" className="mt-1 text-xs text-rose-700 dark:text-rose-300">Couldn’t save your feedback. Try again.</p>}
      <span role="status" className="sr-only">{savedVote ? (savedVote.rating === 'helpful' ? 'Answer liked.' : 'Answer disliked.') : ''}</span>
    </div>
  );
}
