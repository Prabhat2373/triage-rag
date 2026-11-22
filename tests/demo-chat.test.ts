import assert from 'node:assert/strict';
import test from 'node:test';
import { POST } from '../src/app/api/chat/route';
import { demoIncidents, findDemoEvidence } from '../src/features/demo/incidents';
import { readChatEvents } from '../src/features/chat/stream-events';

test('public demo chat returns cited sample evidence without database or Gemini credentials', async (context) => {
  for (const name of ['DEMO_MODE', 'DATABASE_URL', 'GOOGLE_GENERATIVE_AI_API_KEY']) {
    const original = process.env[name];
    context.after(() => {
      if (original === undefined) delete process.env[name];
      else process.env[name] = original;
    });
  }
  process.env.DEMO_MODE = 'true';
  delete process.env.DATABASE_URL;
  delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  async function ask(query: string, previousQuestion?: string) {
    const response = await POST(new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, previousQuestion, sessionId: 1 }),
    }));
    assert.equal(response.status, 200);
    assert.ok(response.body);
    const events = [];
    for await (const event of readChatEvents(response.body)) events.push(event);
    return events;
  }

  for (const events of [await ask('Invoice export failed'), await ask('Anything else?', 'Invoice export failed')]) {
    const [evidence, answer, done] = events;
    assert.equal(evidence.type, 'evidence');
    assert.deepEqual(evidence.sources.map(({ ticketCode }) => ticketCode), ['TKT-9001']);
    assert.equal(answer.type, 'text');
    assert.match(answer.text, /\[TKT-9001\]/);
    assert.equal(done.type, 'done');
  }
  const [evidence] = await ask('Email attachments are corrupted');
  assert.equal(evidence.type, 'evidence');
  assert.deepEqual(evidence.sources, []);
});

test('every demo record has a unique ID and can be retrieved by title and incident code', () => {
  assert.equal(demoIncidents.length, 56);
  assert.equal(new Set(demoIncidents.map(({ ticketCode }) => ticketCode)).size, demoIncidents.length);
  for (const { ticketCode, title } of demoIncidents) {
    assert.equal(findDemoEvidence(title)[0]?.ticketCode, ticketCode, title);
    assert.deepEqual(findDemoEvidence(`How was ${ticketCode} resolved?`).map((source) => source.ticketCode), [ticketCode]);
  }
});
