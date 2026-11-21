'use client';

import React, { useState } from 'react';
import { Shield, Sparkles, Copy, Check, ThumbsUp, ThumbsDown } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import type { SourceItem } from './EvidenceInspector';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  sources?: SourceItem[];
  retrievalLatencyMs?: number;
  redactedCount?: number;
}

interface Props {
  message: ChatMessage;
  isLoading: boolean;
  isLast: boolean;
  onCitationClick: (code: string) => void;
  onOpenEvidence: () => void;
  onFeedback: (queryText: string, rating: 'helpful' | 'unhelpful') => void;
}

export function MessageItem({
  message,
  isLoading,
  isLast,
  onCitationClick,
  onOpenEvidence,
  onFeedback,
}: Props) {
  const [copied, setCopied] = useState(false);
  const isAssistant = message.role === 'assistant';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isAssistant) {
    return (
      <div className="w-full flex justify-end">
        <div className="bg-slate-100 dark:bg-[#2f2f2f] text-slate-900 dark:text-slate-100 px-4 py-3 rounded-3xl max-w-[85%] text-xs leading-relaxed shadow-2xs font-normal">
          {message.content}
        </div>
      </div>
    );
  }

  const isStreaming = isLast && isLoading;

  return (
    <div className="w-full flex gap-3 py-2">
      <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-2xs">
        <Shield className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        {/* Model Badge */}
        <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-mono text-slate-400">
          <Sparkles className="h-3 w-3 text-indigo-500" />
          <span>{message.model || 'qwen3.5:4b'}</span>
          <span className="text-[10px] text-slate-400">· Strict Grounding</span>
          {message.redactedCount ? (
            <span className="px-1.5 py-0.2 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[10px]">
              🔒 {message.redactedCount} secrets redacted
            </span>
          ) : null}
        </div>

        {/* Message Content */}
        <div className="text-xs leading-relaxed text-slate-800 dark:text-slate-100">
          {isStreaming && !message.content ? (
            <div className="flex items-center gap-2 py-3 text-slate-400">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" />
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:300ms]" />
              </div>
              <span className="text-xs font-medium">Searching knowledge base & thinking...</span>
            </div>
          ) : (
            <>
              <MarkdownRenderer content={message.content} onCitationClick={onCitationClick} />
              {isStreaming && (
                <span className="inline-block w-1.5 h-3.5 bg-indigo-500 animate-pulse ml-0.5 align-middle" />
              )}
            </>
          )}
        </div>

        {/* Action Controls & Evidence Link */}
        {message.content && !isStreaming && (
          <div className="flex items-center gap-3 pt-3 mt-1 text-slate-400">
            <button
              onClick={handleCopy}
              className="p-1 hover:text-slate-900 dark:hover:text-white rounded transition cursor-pointer"
              title="Copy answer"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>

            <button
              onClick={() => onFeedback(message.content, 'helpful')}
              className="p-1 hover:text-emerald-500 rounded transition cursor-pointer"
              title="Helpful"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => onFeedback(message.content, 'unhelpful')}
              className="p-1 hover:text-rose-500 rounded transition cursor-pointer"
              title="Unhelpful"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>

            {message.retrievalLatencyMs && (
              <span className="text-[10px] font-mono text-slate-400 pl-2 border-l border-slate-200 dark:border-white/10">
                {message.retrievalLatencyMs}ms retrieval
              </span>
            )}

            {message.sources && message.sources.length > 0 && (
              <button
                onClick={onOpenEvidence}
                className="text-[10px] font-medium text-indigo-500 hover:underline cursor-pointer"
              >
                Inspect {message.sources.length} sources
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
