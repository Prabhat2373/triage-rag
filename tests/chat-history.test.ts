import assert from 'node:assert/strict';
import test from 'node:test';
import { db } from '../src/db';
import { chatMessages, chatSessions } from '../src/db/schema';
import type { AuthContext } from '../src/features/accounts/session';
import { getSessionMessagesAction } from '../src/features/chat/actions';
import { saveChatExchange } from '../src/features/chat/conversation/history';

test('the first completed exchange creates a titled session and subsequent turns reuse it', async (context) => {
  const auth = { org: { id: 3 }, user: { id: 5 } } as AuthContext;
  const sessionRows: unknown[] = [];
  const messageBatches: { sessionId: number; role: string }[][] = [];
  const sessionUpdates: unknown[] = [];
  const transaction = {
    insert(table: unknown) {
      if (table === chatSessions) {
        return { values: (values: unknown) => {
          sessionRows.push(values);
          return { returning: async () => [{ id: 12 }] };
        } };
      }
      assert.equal(table, chatMessages);
      return { values: async (values: { sessionId: number; role: string }[]) => {
        messageBatches.push(values);
      } };
    },
    select() {
      return { from: () => ({ where: () => ({ for: async () => [{ title: 'What happened?' }] }) }) };
    },
    update(table: unknown) {
      assert.equal(table, chatSessions);
      return { set: (values: unknown) => ({ where: async () => { sessionUpdates.push(values); } }) };
    },
  };

  const withinTransaction = context.mock.method(db, 'transaction', (run: (tx: typeof transaction) => Promise<unknown>) => run(transaction));
  const exchange = {
    query: 'What happened?', answer: 'Here is what happened.', model: 'qwen3.5:4b',
    sources: [], retrievalLatencyMs: 0, redactedCount: 0,
  };

  const first = await saveChatExchange(auth, { ...exchange, sessionId: null });
  assert.deepEqual(first, { id: 12, title: exchange.query, model: exchange.model });
  assert.deepEqual(sessionRows, [{ orgId: 3, userId: 5, title: exchange.query, model: exchange.model }]);
  assert.equal(sessionUpdates.length, 0);

  assert.deepEqual(await saveChatExchange(auth, { ...exchange, sessionId: first.id, query: 'What next?' }), first);
  assert.equal(sessionRows.length, 1);
  assert.equal(sessionUpdates.length, 1);
  assert.deepEqual(messageBatches.map((batch) => batch.map(({ sessionId, role }) => [sessionId, role])),
    [[[12, 'user'], [12, 'assistant']], [[12, 'user'], [12, 'assistant']]]);
  assert.equal(withinTransaction.mock.callCount(), 2);
});

test('invalid history IDs redirect to sign-in before accessing the session or database', async () => {
  for (const id of [undefined, null, NaN, 0, -1, 1.5, 2_147_483_648]) {
    await assert.rejects(() => getSessionMessagesAction(id as number), {
      digest: /^NEXT_REDIRECT;replace;\/login;/,
    });
  }
});
