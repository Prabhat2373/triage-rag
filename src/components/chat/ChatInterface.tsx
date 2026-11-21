'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { MessageItem, type ChatMessage } from './MessageItem';
import { ChatInput } from './ChatInput';
import { EvidenceInspector, type SourceItem } from './EvidenceInspector';
import { TicketDetailModal } from '@/components/common/TicketDetailModal';
import { saveChatMessageAction, submitEvaluation } from '@/app/actions';
import type { Ticket, ChatSession } from '@/db/schema';
import type { AuthContext } from '@/lib/auth';

interface Props {
  auth: AuthContext;
  initialChatMessages: ChatMessage[];
  ticketsList: Ticket[];
  activeSessionId: number | null;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  chatSessions: ChatSession[];
  onSessionUpdated?: (sessionId: number, newTitle: string) => void;
  evidenceOpen: boolean;
  onCloseEvidence: () => void;
  onOpenEvidence: () => void;
  onSetEvidenceCount: (count: number) => void;
  isLoadingSession?: boolean;
}

export function ChatInterface({
  auth,
  initialChatMessages,
  ticketsList,
  activeSessionId,
  selectedModel,
  onSelectModel,
  onSessionUpdated,
  evidenceOpen,
  onCloseEvidence,
  onOpenEvidence,
  onSetEvidenceCount,
  isLoadingSession = false,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [retrievedSources, setRetrievedSources] = useState<SourceItem[]>([]);
  const [inspectedTicket, setInspectedTicket] = useState<Ticket | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Sync messages when session changes
  useEffect(() => {
    setMessages(initialChatMessages);
    const lastWithSources = [...initialChatMessages].reverse().find((m) => m.role === 'assistant' && m.sources && m.sources.length > 0);
    const srcs = lastWithSources?.sources || [];
    setRetrievedSources(srcs);
    onSetEvidenceCount(srcs.length);
  }, [initialChatMessages, activeSessionId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleCitationClick = (ticketCodeWithBrackets: string) => {
    const code = ticketCodeWithBrackets.replace(/\[|\]/g, '').trim();
    const found = ticketsList.find((t) => t.ticketCode === code);
    if (found) {
      setInspectedTicket(found);
    }
  };

  const handleFeedback = async (queryText: string, rating: 'helpful' | 'unhelpful') => {
    await submitEvaluation({
      query: queryText,
      modelUsed: selectedModel,
      similarityScore: retrievedSources[0] ? `${(retrievedSources[0].similarity * 100).toFixed(1)}%` : 'N/A',
      rating,
      latencyMs: 280,
    });
  };

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsgId = 'msg-' + Date.now();
    const assistantMsgId = 'msg-' + (Date.now() + 1);

    const newMessages: ChatMessage[] = [
      ...messages,
      { id: userMsgId, role: 'user', content: textToSend },
      { id: assistantMsgId, role: 'assistant', content: '', model: selectedModel },
    ];

    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    if (activeSessionId) {
      saveChatMessageAction({
        sessionId: activeSessionId,
        role: 'user',
        content: textToSend,
        model: selectedModel,
      }).then((res) => {
        if (res.success && res.updatedTitle && onSessionUpdated) {
          onSessionUpdated(activeSessionId, res.updatedTitle);
        }
      });
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: textToSend }],
          model: selectedModel,
          temperature: 0.1,
          orgId: auth.org.id,
          userId: auth.user.id,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      let parsedSources: SourceItem[] = [];
      const sourcesHeader = res.headers.get('x-sources');
      if (sourcesHeader) {
        try {
          parsedSources = JSON.parse(decodeURIComponent(sourcesHeader));
          setRetrievedSources(parsedSources);
          onSetEvidenceCount(parsedSources.length);
          if (parsedSources.length > 0) {
            onOpenEvidence();
          }
        } catch {
          // ignore
        }
      }

      const latencyHeader = res.headers.get('x-retrieval-latency');
      const latencyMs = latencyHeader ? parseInt(latencyHeader, 10) : undefined;
      const redactedHeader = res.headers.get('x-redacted-count');
      const redactedCount = redactedHeader ? parseInt(redactedHeader, 10) : 0;

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          assistantText += chunk;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content: assistantText,
                    sources: parsedSources,
                    retrievalLatencyMs: latencyMs,
                    redactedCount,
                  }
                : m
            )
          );
        }
      }

      if (activeSessionId && assistantText) {
        saveChatMessageAction({
          sessionId: activeSessionId,
          role: 'assistant',
          content: assistantText,
          model: selectedModel,
          sources: parsedSources,
          retrievalLatencyMs: latencyMs,
          redactedCount,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error processing query';
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantMsgId ? { ...m, content: `⚠️ ${msg}` } : m))
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden relative">
      <div className="flex-1 flex flex-col justify-between overflow-hidden relative">
        <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth">
          <div className="max-w-3xl mx-auto w-full">
            {isLoadingSession ? (
              <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" />
                  <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:150ms]" />
                  <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:300ms]" />
                </div>
                <span className="text-xs font-medium">Loading conversation history...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
                <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-[#2f2f2f] flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-xs">
                  <Shield className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  What incident can I help you triage?
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-8">
                  Ask about production outages, error codes, or customer bugs in {auth.org.name}. Resolutions are strictly grounded against your verified post-mortems.
                </p>

                {/* 2x2 Suggested Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl text-left">
                  <button
                    onClick={() => handleSendMessage('Our webhook endpoint keeps failing HMAC verification with 401 Invalid Signature.')}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#2f2f2f]/60 hover:bg-slate-100 dark:hover:bg-[#2f2f2f] border border-slate-200/80 dark:border-white/10 transition cursor-pointer text-left group"
                  >
                    <div className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition mb-1">
                      🔐 Webhook Signature 401
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      HMAC verification failure with raw body parsing middleware
                    </div>
                  </button>

                  <button
                    onClick={() => handleSendMessage('Parallel API requests cause JWT refresh token race condition and log user out.')}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#2f2f2f]/60 hover:bg-slate-100 dark:hover:bg-[#2f2f2f] border border-slate-200/80 dark:border-white/10 transition cursor-pointer text-left group"
                  >
                    <div className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition mb-1">
                      ⚡ JWT Refresh Token Race
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      Concurrent requests failing after rotation grace period
                    </div>
                  </button>

                  <button
                    onClick={() => handleSendMessage('Postgres database connection pool exhaustion under spiked traffic.')}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#2f2f2f]/60 hover:bg-slate-100 dark:hover:bg-[#2f2f2f] border border-slate-200/80 dark:border-white/10 transition cursor-pointer text-left group"
                  >
                    <div className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition mb-1">
                      🗄️ Database Connection Exhaustion
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      Remaining connection slots reserved for superuser
                    </div>
                  </button>

                  <button
                    onClick={() => handleSendMessage('Stripe payment webhook duplicate charges missing idempotency key.')}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#2f2f2f]/60 hover:bg-slate-100 dark:hover:bg-[#2f2f2f] border border-slate-200/80 dark:border-white/10 transition cursor-pointer text-left group"
                  >
                    <div className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition mb-1">
                      💳 Stripe Duplicate Billing
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      Double charges on mobile network timeout and retry
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((m, idx) => (
                  <MessageItem
                    key={m.id || idx}
                    message={m}
                    isLoading={isLoading}
                    isLast={idx === messages.length - 1}
                    onCitationClick={handleCitationClick}
                    onOpenEvidence={onOpenEvidence}
                    onFeedback={handleFeedback}
                  />
                ))}
                <div ref={chatBottomRef} />
              </div>
            )}
          </div>
        </div>

        <ChatInput
          input={input}
          setInput={setInput}
          onSubmit={handleSendMessage}
          isLoading={isLoading}
          selectedModel={selectedModel}
          onSelectModel={onSelectModel}
          orgName={auth.org.name}
        />
      </div>

      <EvidenceInspector
        isOpen={evidenceOpen}
        onClose={onCloseEvidence}
        sources={retrievedSources}
        onSelectTicket={handleCitationClick}
      />

      <TicketDetailModal
        ticket={inspectedTicket}
        onClose={() => setInspectedTicket(null)}
      />
    </div>
  );
}
