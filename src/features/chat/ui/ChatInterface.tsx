'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { ArrowDown } from 'lucide-react';
import type { ChatModelOption } from '../models/catalog';
import { isConversationalFollowUp, replyToGreeting } from '../conversation/context';
import type { IncidentSuggestionState } from '../retrieval/suggestions';
import { ChatWelcome } from './ChatWelcome';
import { MessageItem, type DisplayMessage } from './MessageItem';
import { ChatInput } from './ChatInput';
import { EvidenceInspector } from './EvidenceInspector';
import { TicketDetailModal } from '@/features/incidents/ui/TicketDetailModal';
import { submitEvaluation } from '@/features/chat/actions';
import { readChatEvents } from '@/features/chat/stream-events';
import type { ChatMessage, SourceItem } from '@/features/chat/types';
import { getIncidentByCode } from '@/features/incidents/actions';
import type { IncidentRecord } from '@/features/incidents/incident-records';

interface Props {
  demoIncidents?: IncidentRecord[];
  chatEndpoint?: string;
  incidentSuggestions: IncidentSuggestionState;
  initialChatMessages: ChatMessage[];
  activeSessionId: number | null;
  selectedModel: string;
  modelOptions: ChatModelOption[];
  onSelectModel: (model: string) => void;
  onSessionUpdated?: (sessionId: number, newTitle: string) => void;
  evidenceOpen: boolean;
  onCloseEvidence: () => void;
  onOpenEvidence: () => void;
  onSetEvidenceCount?: (count: number) => void;
}

export function ChatInterface({
  demoIncidents,
  chatEndpoint = '/api/chat',
  incidentSuggestions,
  initialChatMessages,
  activeSessionId,
  selectedModel,
  modelOptions,
  onSelectModel,
  onSessionUpdated,
  evidenceOpen,
  onCloseEvidence,
  onOpenEvidence,
  onSetEvidenceCount,
}: Props) {
  const [messages, setMessages] = useState<DisplayMessage[]>(initialChatMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [retrievedSources, setRetrievedSources] = useState<SourceItem[]>(() =>
    [...initialChatMessages].reverse().find((message) => message.sources)?.sources ?? []
  );
  const [inspectedTicket, setInspectedTicket] = useState<IncidentRecord | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const [showJump, setShowJump] = useState(false);

  function trackScroll() {
    const transcript = transcriptRef.current;
    if (!transcript) return;
    followLatest.current = transcript.scrollHeight - transcript.scrollTop - transcript.clientHeight < 80;
    setShowJump(!followLatest.current);
  }

  function jumpToLatest() {
    const transcript = transcriptRef.current;
    if (!transcript) return;
    followLatest.current = true;
    transcript.scrollTop = transcript.scrollHeight;
    setShowJump(false);
  }

  const activeRequest = useRef<AbortController | null>(null);
  const requestNumber = useRef(0);

  useEffect(() => () => activeRequest.current?.abort(), []);
  useEffect(() => {
    onSetEvidenceCount?.(retrievedSources.length);
  }, [onSetEvidenceCount, retrievedSources.length]);

  useLayoutEffect(() => {
    const transcript = transcriptRef.current;
    if (transcript && followLatest.current) transcript.scrollTop = transcript.scrollHeight;
  }, [messages, isLoading]);

  const [citationError, setCitationError] = useState('');
  const citationRequest = useRef(0);

  async function handleCitationClick(ticketCode: string) {
    const requestId = ++citationRequest.current;
    setCitationError('');
    try {
      const code = ticketCode.replace(/^\[|\]$/g, '').trim();
      const incident = demoIncidents
        ? demoIncidents.find(({ ticketCode }) => ticketCode === code)
        : await getIncidentByCode(code);
      if (requestId !== citationRequest.current) return;
      if (!incident) throw new Error('Incident unavailable');
      setInspectedTicket(incident);
    } catch {
      if (requestId === citationRequest.current) setCitationError('This incident is no longer available.');
    }
  }

  const handleFeedback = async (message: ChatMessage, rating: 'helpful' | 'unhelpful', evaluationId?: number) => {
    return submitEvaluation({
      evaluationId,
      query: message.content,
      modelUsed: message.model ?? selectedModel,
      similarityScore: message.sources?.[0]?.matchKind === 'keyword' ? 'Keyword match' : message.sources?.[0] ? `${(message.sources[0].similarity * 100).toFixed(1)}%` : 'N/A',
      rating,
      latencyMs: message.retrievalLatencyMs,
    });
  };

  const handleSendMessage = async (queryText?: string, retryUserId?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || activeRequest.current) return;

    const recentMessages = retryUserId ? messages.slice(0, -2) : messages;
    const previousQuestion = recentMessages.findLast((message, index) =>
      message.role === 'user' && (demoIncidents
        ? !isConversationalFollowUp(message.content) && Boolean(recentMessages[index + 1]?.sources?.length)
        : !replyToGreeting(message.content))
    )?.content.slice(0, 1800);

    const turn = ++requestNumber.current;
    const userMsgId = retryUserId ?? `pending-user-${turn}`;
    const assistantMsgId = `pending-answer-${turn}`;

    const priorMessages = retryUserId ? messages.slice(0, -1) : [
      ...messages, { id: userMsgId, role: 'user' as const, content: textToSend },
    ];
    followLatest.current = true;
    setShowJump(false);
    setMessages([...priorMessages, { id: assistantMsgId, role: 'assistant', content: '', model: selectedModel }]);
    if (!retryUserId) setInput('');
    setIsLoading(true);

    const request = new AbortController();
    activeRequest.current = request;

    try {
      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textToSend, model: selectedModel, sessionId: activeSessionId, previousQuestion: activeSessionId == null ? previousQuestion : undefined }),
        signal: request.signal,
      });

      if (!response.ok || !response.body) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Chat request failed (HTTP ${response.status}).`);
      }

      let finished = false;
      for await (const event of readChatEvents(response.body)) {
        if (event.type === 'evidence') {
          setRetrievedSources(event.sources);
          setMessages((previous) => previous.map((message) => {
            if (message.id === userMsgId) return { ...message, content: event.query };
            if (message.id !== assistantMsgId) return message;
            return {
              ...message,
              sources: event.sources,
              retrievalLatencyMs: event.retrievalLatencyMs,
              redactedCount: event.redactedCount,
            };
          }));
        } else if (event.type === 'text') {
          setMessages((previous) => previous.map((message) =>
            message.id === assistantMsgId ? { ...message, content: message.content + event.text } : message
          ));
        } else if (event.type === 'error') {
          throw new Error(event.message);
        } else if (event.type === 'done') {
          finished = true;
          if (activeSessionId && event.title) onSessionUpdated?.(activeSessionId, event.title);
          break;
        }
      }

      if (!finished) throw new Error('The chat response ended early.');
    } catch (error) {
      if (request.signal.aborted) {
        if (request.signal.reason === 'user-stopped') {
          setMessages((previous) => previous.map((item) =>
            item.id === assistantMsgId ? { ...item, interruption: { kind: 'stopped' } } : item
          ));
        }
        return;
      }
      const message = error instanceof Error ? error.message : 'Could not complete the response.';
      setMessages((previous) =>
        previous.map((item) => item.id === assistantMsgId ? { ...item, interruption: { kind: 'error', message } } : item)
      );
    } finally {
      activeRequest.current = null;
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-w-0 flex-1 overflow-hidden">
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#f8f9fc] dark:bg-[#1b1924]">
        <div ref={transcriptRef} onScroll={trackScroll} aria-label="Conversation" className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
            {messages.length === 0 ? (
              <ChatWelcome sample={Boolean(demoIncidents)} {...incidentSuggestions} onPrompt={handleSendMessage} />
            ) : (
              <div className="space-y-8 py-3 sm:py-6">
                {messages.map((m, idx) => (
                  <MessageItem
                    key={m.id || idx}
                    message={m}
                    isLoading={isLoading}
                    isLast={idx === messages.length - 1}
                    onRetry={idx === messages.length - 1 && messages[idx - 1]?.role === 'user'
                      ? () => void handleSendMessage(messages[idx - 1].content, messages[idx - 1].id)
                      : undefined}
                    onCitationClick={handleCitationClick}
                    onOpenEvidence={() => {
                      if (m.sources?.length) setRetrievedSources(m.sources);
                      onOpenEvidence();
                    }}
                    onFeedback={demoIncidents ? undefined : handleFeedback}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {showJump && messages.length > 0 && (
          <div className="relative z-10 flex h-0 justify-center">
            <button type="button" onClick={jumpToLatest} className="absolute bottom-3 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-md hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-500 dark:border-white/15 dark:bg-[#252131] dark:text-slate-100">
              <ArrowDown aria-hidden="true" className="size-4" /> Jump to latest
            </button>
          </div>
        )}
        {citationError && <p role="alert" className="px-6 text-xs text-red-600">{citationError}</p>}
        <ChatInput
          input={input}
          setInput={setInput}
          onSubmit={handleSendMessage}
          isLoading={isLoading}
          selectedModel={selectedModel}
          modelOptions={modelOptions}
          onSelectModel={onSelectModel}
          onStop={() => activeRequest.current?.abort('user-stopped')}
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
