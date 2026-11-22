'use client';

import { Shield, Sparkles, RotateCcw } from 'lucide-react';
import { MessageActions, type SaveRating } from './MessageActions';
import { ResponseProgress } from './ResponseProgress';
import { MarkdownRenderer } from './MarkdownRenderer';
import { CHAT_MODELS } from '../models/catalog';
import type { ChatMessage } from '../types';

export type DisplayMessage = ChatMessage & {
  interruption?: { kind: 'stopped' } | { kind: 'error'; message: string };
};

interface Props {
  message: DisplayMessage;
  onRetry?: () => void;
  isLoading: boolean;
  isLast: boolean;
  onCitationClick: (code: string) => void;
  onOpenEvidence: () => void;
  onFeedback: SaveRating;
}

export function MessageItem({
  message,
  onRetry,
  isLoading,
  isLast,
  onCitationClick,
  onOpenEvidence,
  onFeedback,
}: Props) {
  const isAssistant = message.role === 'assistant';

  if (!isAssistant) {
    return (
      <div className="w-full flex justify-end">
        <div className="max-w-[90%] whitespace-pre-wrap break-words rounded-[22px] rounded-br-md border border-violet-100 bg-violet-50 px-4 py-3 text-sm leading-6 text-slate-950 dark:border-violet-400/15 dark:bg-[#302640] dark:text-white">
          {message.content}
        </div>
      </div>
    );
  }

  const isStreaming = isLast && isLoading;
  const interruption = message.interruption;

  return (
    <div className="w-full flex gap-3 py-2">
      <div className="size-9 rounded-xl bg-violet-700 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-2xs">
        <Shield className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        {/* Model Badge */}
        <div className="flex items-center gap-1.5 mb-1.5 text-xs text-slate-600 dark:text-slate-300">
          <Sparkles className="h-3 w-3 text-indigo-500" />
          <span className="font-semibold text-slate-900 dark:text-white">TriageRAG</span>
          <span>· {CHAT_MODELS.find((model) => model.id === message.model)?.name ?? message.model}</span>
          {message.redactedCount ? (
            <span className="px-1.5 py-0.2 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[10px]">
              🔒 {message.redactedCount} secrets redacted
            </span>
          ) : null}
        </div>

        {/* Message Content */}
        <div className="text-sm leading-6 text-slate-800 dark:text-slate-100">
          {isStreaming && !message.content ? (
            <ResponseProgress sourceCount={message.sources?.length} />
          ) : (
            <>
              {message.content && <MarkdownRenderer content={message.content} onCitationClick={onCitationClick} />}
              {isStreaming && (
                <span className="inline-block w-1.5 h-3.5 bg-violet-500 motion-safe:animate-pulse ml-0.5 align-middle" />
              )}
            </>
          )}
        </div>

        {!isStreaming && interruption && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-[#252131]">
            {interruption.kind === 'error' ? (
              <p role="alert" className="text-rose-700 dark:text-rose-300">{interruption.message}</p>
            ) : (
              <p role="status" className="text-slate-700 dark:text-slate-200">Response stopped.</p>
            )}
            {onRetry && (
              <button type="button" onClick={onRetry} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-500 dark:text-violet-300 dark:hover:bg-violet-400/15">
                <RotateCcw aria-hidden="true" className="size-3.5" /> Retry question
              </button>
            )}
          </div>
        )}
        {message.content && !isStreaming && !interruption && (
          <MessageActions message={message} onFeedback={onFeedback} onOpenEvidence={onOpenEvidence} />
        )}
      </div>
    </div>
  );
}
