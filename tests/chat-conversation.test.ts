import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isConversationalFollowUp, replyToGreeting } from '../src/features/chat/conversation/context';

test('contextual follow-ups are distinguished from a new incident', () => {
  assert.equal(isConversationalFollowUp('Okay, anything else to check?'), true);
  assert.equal(isConversationalFollowUp('How can I verify that?'), true);
  assert.equal(isConversationalFollowUp('Database connections are timing out after a deployment.'), false);
  assert.equal(isConversationalFollowUp('Can you explain the GitHub integration?'), false);
});

test('greetings and acknowledgments can be answered without retrieving incidents', () => {
  assert.match(replyToGreeting('Hi!') ?? '', /Tell me what you’re investigating/);
  assert.match(replyToGreeting('Thanks.') ?? '', /keep investigating/);
  assert.equal(replyToGreeting('Okay, anything else to check?'), undefined);
});
