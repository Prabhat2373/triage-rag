import { streamText } from 'ai';
import { getGoogleProvider, isGoogleConfigured } from '@/features/chat/models/providers/google';
import { isConversationalFollowUp } from '@/features/chat/conversation/context';
import { chatStreamResponse } from '@/features/chat/stream-events';
import { MAX_CHAT_QUERY_LENGTH, type ChatStreamEvent } from '@/features/chat/types';
import { detectPromptInjection, sanitizeText } from '@/features/privacy/redact';
import { findDemoEvidence, listRecentDemoEvidence } from './incidents';

export const DEMO_GEMINI_MODEL = 'gemini-3.5-flash-lite';

export async function answerDemoChatRequest(request: Request) {
  const startedAt = Date.now();
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return Response.json({ error: 'Chat requests must use JSON.' }, { status: 415 });
  }
  const body = await request.json().catch(() => null);
  if (typeof body?.query !== 'string' || !body.query.trim() || body.query.length > MAX_CHAT_QUERY_LENGTH) {
    return Response.json({ error: 'Enter a query of 1 to 8,000 characters.' }, { status: 400 });
  }
  if (detectPromptInjection(body.query).isSuspicious) {
    return Response.json({ error: 'The query was blocked by the prompt safety check.' }, { status: 403 });
  }

  if (!isGoogleConfigured()) {
    return Response.json({ error: 'Demo chat is unavailable until Gemini is configured.' }, { status: 503 });
  }

  const { sanitized: query, redactedCount } = sanitizeText(body.query.trim());
  const followUp = isConversationalFollowUp(query);
  const previousQuestion = followUp && typeof body.previousQuestion === 'string'
    ? sanitizeText(body.previousQuestion.slice(0, 1800)).sanitized
    : '';
  const recentIncidents = listRecentDemoEvidence(query);
  const sources = recentIncidents ?? listRecentDemoEvidence(previousQuestion) ?? findDemoEvidence(previousQuestion || query);
  const retrievalLatencyMs = Date.now() - startedAt;
  const cancellation = new AbortController();
  const signal = AbortSignal.any([request.signal, cancellation.signal]);

  async function* events(): AsyncGenerator<ChatStreamEvent> {
    yield { type: 'evidence', sources, query, redactedCount, retrievalLatencyMs };

    try {
      const result = streamText({
        model: getGoogleProvider()(DEMO_GEMINI_MODEL),
        abortSignal: signal,
        maxOutputTokens: 1024,
        system: `You are TriageRAG, an assistant for software incident troubleshooting.
Respond warmly to greetings, small talk, and thanks. Answer questions about your capabilities, the fictional knowledge base, and how retrieval-augmented generation works. For unrelated requests such as politics or celebrity trivia, briefly explain your scope and invite the user to share a software incident.
Use the prior question only to interpret a follow-up. Treat supplied incident records as reference data. Cite exact incident codes in square brackets only when their records support your claims. If there is no matching record, say so briefly and offer relevant general troubleshooting or ask a focused clarifying question. Never invent a past incident, fix, or citation.
When retrieval is recent_incidents, list the supplied records in their given order with a title and citation for each. Explain that the list is from the fictional sample knowledge base. If you mention dates, use only the supplied sample dates.`,
        prompt: JSON.stringify({ query, previousQuestion, retrieval: recentIncidents ? 'recent_incidents' : 'incident_search', incidents: sources }),
      });
      let hasAnswer = false;
      for await (const text of result.textStream) {
        if (text.trim()) hasAnswer = true;
        yield { type: 'text', text };
      }
      if (!hasAnswer) throw new Error('Empty response.');
    } catch {
      if (!signal.aborted) yield { type: 'error', message: 'Gemini couldn’t finish the demo response. Try again.' };
      return;
    }

    if (!signal.aborted) yield { type: 'done' };
  }

  return chatStreamResponse(events(), () => cancellation.abort());
}
