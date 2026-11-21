import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashPassword, verifyPassword } from '../src/features/accounts/password';
import { describeRegistrationFailure } from '../src/features/accounts/registration-error';
import { chatStreamResponse, readChatEvents } from '../src/features/chat/stream-events';
import type { ChatStreamEvent } from '../src/features/chat/types';
import { validateWebhookUrl } from '../src/features/integrations/webhook-destination';
import { sanitizeText } from '../src/features/privacy/redact';

test('passwords are salted and an account without a password cannot sign in', async () => {
  const password = 'test-only-long-password';
  const firstHash = await hashPassword(password);
  const secondHash = await hashPassword(password);

  assert.notEqual(firstHash, secondHash);
  assert.equal(await verifyPassword(password, firstHash), true);
  assert.equal(await verifyPassword('incorrect-test-password', firstHash), false);
  assert.equal(await verifyPassword(password, null), false);
});

test('the webhook policy accepts only recognized HTTPS provider destinations', () => {
  const webhook = 'https://hooks.slack.com/services/T123/B123/test-token';
  assert.equal(validateWebhookUrl(webhook, 'slack').href, webhook);
  assert.throws(() => validateWebhookUrl(webhook, 'teams'));
  assert.throws(() => validateWebhookUrl('https://example.com/services/T123/B123/test-token', 'slack'));
  assert.throws(() => validateWebhookUrl(webhook.replace('https:', 'http:'), 'slack'));
});

test('query text masks email addresses and connection-string passwords', () => {
  const result = sanitizeText('Contact person@example.com or connect to postgres://dbuser:test-password@db.example');
  assert.equal(result.sanitized, 'Contact [REDACTED_EMAIL] or connect to postgres://dbuser:[REDACTED_SECRET]@db.example');
  assert.equal(result.redactedCount, 2);
});

test('large evidence travels in the body and fragmented text decodes correctly', async () => {
  const events: ChatStreamEvent[] = [
    {
      type: 'evidence', query: 'Example question', retrievalLatencyMs: 20, redactedCount: 0,
      sources: [{
        ticketCode: 'TKT-1234', title: 'Example', category: 'Database',
        symptom: 'Sample symptom ', resolution: 'Resolved by a specialist 🔧. '.repeat(1000), similarity: 0.9,
      }],
    },
    { type: 'text', text: 'Resolved 🔧' },
    { type: 'done', title: 'Example question' },
  ];
  async function* responseEvents() {
    yield* events;
  }

  const response = chatStreamResponse(responseEvents(), () => {});
  assert.equal(response.headers.get('x-sources'), null);
  assert.match(response.headers.get('content-type') ?? '', /^application\/x-ndjson/);
  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.ok(bytes.length > 16000);

  const fragmentedBody = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let index = 0; index < bytes.length; index += 7) {
        controller.enqueue(bytes.subarray(index, index + 7));
      }
      controller.close();
    },
  });
  const received: ChatStreamEvent[] = [];
  for await (const event of readChatEvents(fragmentedBody)) received.push(event);

  assert.deepEqual(received, events);
});

test('an incomplete event fails instead of looking like a successful chat', async () => {
  const incomplete = new Response('{"type":"don').body;
  assert.ok(incomplete);
  await assert.rejects(async () => {
    for await (const event of readChatEvents(incomplete)) {
      assert.fail(`Unexpected event ${event.type}`);
    }
  }, /ended before the final event/);
});

test('registration distinguishes an old schema or ID counter from a duplicate email', () => {
  function wrappedFailure(code: string, constraint_name?: string) {
    return new Error('Query failed', { cause: { code, constraint_name } });
  }

  assert.equal(describeRegistrationFailure(wrappedFailure('42703')).reason, 'database-setup');
  assert.equal(describeRegistrationFailure(wrappedFailure('42P01')).reason, 'database-setup');
  assert.equal(describeRegistrationFailure(wrappedFailure('23505', 'organizations_pkey')).reason, 'database-setup');
  assert.equal(describeRegistrationFailure(wrappedFailure('23505', 'users_email_unique')).reason, 'email-conflict');
  assert.equal(describeRegistrationFailure(wrappedFailure('ECONNREFUSED')).reason, 'database-connection');
});
