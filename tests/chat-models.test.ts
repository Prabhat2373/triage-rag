import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHAT_MODELS, DEFAULT_CHAT_MODEL, isChatModel } from '../src/features/chat/models/catalog';
import { canSaveWithoutLocalEmbeddings, getChatModelOptions, getChatProvider } from '../src/features/chat/models/registry';

test('all catalog models route to registered providers and keep stable model IDs', () => {
  assert.equal(new Set(CHAT_MODELS.map(({ id }) => id)).size, CHAT_MODELS.length);
  for (const { id } of CHAT_MODELS) {
    assert.equal(isChatModel(id), true);
    assert.equal(typeof getChatProvider(id).retrieve, 'function');
  }
  assert.equal(isChatModel('unknown-model'), false);
  const local = getChatProvider(DEFAULT_CHAT_MODEL).createModel(DEFAULT_CHAT_MODEL);
  assert.notEqual(typeof local, 'string');
  if (typeof local !== 'string') assert.equal(local.modelId, DEFAULT_CHAT_MODEL);
});

test('cloud availability is reflected in public model options without exposing the key', (context) => {
  const envName = 'GOOGLE_GENERATIVE_AI_API_KEY';
  const original = process.env[envName];
  context.after(() => {
    if (original === undefined) delete process.env[envName];
    else process.env[envName] = original;
  });
  const googleModel = CHAT_MODELS.find(({ provider }) => provider === 'google')!;
  delete process.env[envName];
  assert.equal(getChatModelOptions().find(({ id }) => id === googleModel.id)?.available, false);
  assert.equal(canSaveWithoutLocalEmbeddings(), false);

  process.env[envName] = 'test-only-key';
  const options = getChatModelOptions();
  assert.equal(options.find(({ id }) => id === googleModel.id)?.available, true);
  assert.equal(canSaveWithoutLocalEmbeddings(), true);
  assert.doesNotMatch(JSON.stringify(options), /test-only-key/);
});
