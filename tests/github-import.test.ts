import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readGitHubInput, toGitHubIncident } from '../src/features/integrations/github/issues';

const input = readGitHubInput({ owner: 'sample-org', repo: 'checkout', label: 'incident' });

const issue = {
  id: 103450,
  number: 42,
  title: 'Checkout timeout',
  state_reason: 'completed',
  labels: [{ name: 'incident' }],
  body: 'Checkout stalled after the deploy.\n\n## Resolution\nReverted the setting.\n\n## Notes\nHealthy for an hour.',
};

test('a resolved issue gets a stable source ID and a link to the original', () => {
  assert.deepEqual(toGitHubIncident(issue, input), {
    ticketCode: 'GH-103450',
    category: 'incident',
    title: 'Checkout timeout',
    symptom: 'Checkout stalled after the deploy.',
    resolution: 'Reverted the setting.',
    sourceUrl: 'https://github.com/sample-org/checkout/issues/42',
  });
});

test('pull requests, issues closed as not planned, and undocumented fixes are excluded', () => {
  assert.equal(toGitHubIncident({ ...issue, pull_request: {} }, input), null);
  assert.equal(toGitHubIncident({ ...issue, state_reason: 'not_planned' }, input), null);
  assert.equal(toGitHubIncident({ ...issue, body: 'Checkout stalled.' }, input), null);
  assert.equal(toGitHubIncident({ ...issue, body: '## Resolution\nTBD' }, input), null);
});

test('repository input is restricted to an owner and repository path segment', () => {
  assert.equal(input.token, '');
  assert.throws(() => readGitHubInput({ owner: 'https://example.com', repo: 'checkout' }));
  assert.throws(() => readGitHubInput({ owner: 'sample-org', repo: '..' }));
});
