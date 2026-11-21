import { embed, streamText } from 'ai';
import { ollama } from 'ollama-ai-provider-v2';
import { db } from '@/db';
import { tickets, users } from '@/db/schema';
import { and, desc, eq, gt, sql } from 'drizzle-orm';
import { sanitizeText, detectPromptInjection } from '@/lib/sanitizer';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request) {
  const requestStart = Date.now();

  try {
    const body = await req.json();
    const messages = body.messages || [];
    const requestedModel = body.model || 'qwen3.5:4b';
    const temperature = typeof body.temperature === 'number' ? body.temperature : 0.1;
    const orgId = typeof body.orgId === 'number' ? body.orgId : 1;
    const userId = typeof body.userId === 'number' ? body.userId : 1;

    // Fetch user details for audit
    const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const user = userRows[0] || { name: 'Engineer', role: 'member' };

    // Extract latest user message
    let rawQuery = '';
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (typeof lastMsg.content === 'string') {
        rawQuery = lastMsg.content;
      } else if (Array.isArray(lastMsg.parts)) {
        rawQuery = lastMsg.parts
          .filter((p: { type: string; text?: string }) => p.type === 'text' && p.text)
          .map((p: { text: string }) => p.text)
          .join('\n');
      }
    } else if (typeof body.prompt === 'string') {
      rawQuery = body.prompt;
    }

    if (!rawQuery || rawQuery.trim() === '') {
      return new Response(JSON.stringify({ error: 'User message query is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Security Check: Prompt Injection / Adversarial Query Detection
    const securityCheck = detectPromptInjection(rawQuery);
    if (securityCheck.isSuspicious) {
      await logAuditEvent({
        orgId,
        userId,
        userName: user.name,
        userRole: user.role,
        action: 'CHAT_QUERY',
        details: { query: rawQuery, blocked: true, reason: securityCheck.reason },
      });

      return new Response(
        JSON.stringify({
          error: `Security Guardrail Triggered: ${securityCheck.reason}`,
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Data Protection: PII & Secret Scrubbing
    const { sanitized: userQuery, redactedCount, redactedTypes } = sanitizeText(rawQuery);
    if (redactedCount > 0) {
      await logAuditEvent({
        orgId,
        userId,
        userName: user.name,
        userRole: user.role,
        action: 'PII_SCRUBBED',
        details: { count: redactedCount, types: redactedTypes },
      });
    }

    // 3. Generate 768-dimension embedding via nomic-embed-text
    const embedStart = Date.now();
    const { embedding } = await embed({
      model: ollama.textEmbeddingModel('nomic-embed-text'),
      value: userQuery,
    });
    const embedLatency = Date.now() - embedStart;

    // 4. Multi-Tenant Vector Search with HNSW Cosine Distance
    // Explicit vector string cast and strict tenant isolation (org_id = orgId)
    const dbStart = Date.now();
    const vectorStr = `[${embedding.join(',')}]`;
    const similaritySql = sql<number>`(1 - (${tickets.embedding} <=> ${vectorStr}::vector))`;

    const matchedTickets = await db
      .select({
        id: tickets.id,
        ticketCode: tickets.ticketCode,
        category: tickets.category,
        title: tickets.title,
        symptom: tickets.symptom,
        resolution: tickets.resolution,
        similarity: similaritySql,
      })
      .from(tickets)
      .where(and(eq(tickets.orgId, orgId), gt(similaritySql, 0.55)))
      .orderBy(desc(similaritySql))
      .limit(3);

    const dbLatency = Date.now() - dbStart;
    const topSimilarity = matchedTickets.length > 0 ? Number(matchedTickets[0].similarity) : 0;

    // 5. Audit Log the Query & Retrieval Performance
    await logAuditEvent({
      orgId,
      userId,
      userName: user.name,
      userRole: user.role,
      action: 'CHAT_QUERY',
      details: {
        query: userQuery,
        matchesCount: matchedTickets.length,
        topScore: (topSimilarity * 100).toFixed(1) + '%',
        model: requestedModel,
        embedLatencyMs: embedLatency,
        dbLatencyMs: dbLatency,
        totalRetrievalLatencyMs: Date.now() - requestStart,
      },
    });

    // 6. Build Context & Strict Guardrail Prompt
    const hasMatches = matchedTickets.length > 0;
    const contextText = hasMatches
      ? matchedTickets
          .map(
            (t) =>
              `[${t.ticketCode}] (${t.category})\nTitle: ${t.title}\nSymptom: ${t.symptom}\nResolution: ${t.resolution}\nSimilarity: ${(Number(t.similarity) * 100).toFixed(1)}%`
          )
          .join('\n\n---\n\n')
      : 'NO_MATCHING_TICKETS';

    const systemPrompt = `You are TriageRAG Enterprise, a Private Incident & Support Resolution Copilot.
You assist on-call DevOps, SREs, and technical support engineers in diagnosing and resolving production bugs.

Retrieved Past Resolved Incidents from Knowledge Base (Tenant ID: ${orgId}):
${contextText}

STRICT OPERATIONAL RULES:
1. Answer ONLY using the information contained in the retrieved past resolved incidents above.
2. Cite ticket codes inline like [TKT-XXXX] whenever referencing a diagnosis, symptom, cause, or resolution.
3. If no past incidents were retrieved (or if none of the retrieved incidents provide the answer to the user's issue), you MUST reply with EXACTLY this sentence and nothing else:
"No matching past incident found in the knowledge base."
4. Do not make up facts, external library versions, or solutions not present in the provided tickets.`;

    const result = streamText({
      model: ollama(requestedModel),
      system: systemPrompt,
      temperature,
      messages: [
        {
          role: 'user',
          content: userQuery,
        },
      ],
    });

    const sourcesData = matchedTickets.map((t) => ({
      ticketCode: t.ticketCode,
      category: t.category,
      title: t.title,
      symptom: t.symptom,
      resolution: t.resolution,
      similarity: Number(t.similarity),
    }));

    const retrievalLatency = Date.now() - requestStart;

    return result.toTextStreamResponse({
      headers: {
        'x-sources': encodeURIComponent(JSON.stringify(sourcesData)),
        'x-retrieval-latency': String(retrievalLatency),
        'x-redacted-count': String(redactedCount),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error in triage chat';
    console.error('Error in /api/chat route:', error);
    return new Response(
      JSON.stringify({
        error: message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
