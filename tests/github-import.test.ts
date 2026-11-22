import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchGitHubIncidents, readGitHubInput, toGitHubIncident } from '../src/features/integrations/github/issues';

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

test('a maintainer comment can provide a fix while the issue body provides the symptoms', () => {
  const result = toGitHubIncident({ ...issue, body: 'Checkout stalled.', user: { login: 'reporter' } }, input, [
    { body: 'Fixed by reverting the connection pool configuration.', author_association: 'MEMBER' },
    { body: 'Thanks, closing this.', author_association: 'MEMBER' },
  ]);
  assert.equal(result?.symptom, 'Checkout stalled.');
  assert.equal(result?.resolution, 'Fixed by reverting the connection pool configuration.');
});

test('ignores unrelated replies and accepts a resolution posted by the issue author', () => {
  const reported = { ...issue, body: null, user: { login: 'reporter' } };
  assert.equal(toGitHubIncident(reported, input, [
    { body: 'Can you try replacing the database driver?', user: { login: 'random-user' } },
    { body: 'Fixed!', author_association: 'MEMBER' },
  ]), null);
  assert.equal(toGitHubIncident(reported, input, [
    { body: 'Resolution: Restored the previous connection settings.', user: { login: 'reporter' } },
  ])?.resolution, 'Restored the previous connection settings.');
});


test('a completed issue can use a concrete fix reported by a participant', () => {
  const reported = { ...issue, body: 'VM creation returned HTTP 500: no resources available.' };
  const comments = [
    { body: 'Can you try another zone?', author_association: 'NONE' },
    { body: 'Resolved this issue by using Mumbai zone', author_association: 'NONE' },
  ];
  assert.equal(toGitHubIncident(reported, input, comments)?.resolution, comments[1].body);
  assert.equal(toGitHubIncident({ ...reported, state_reason: null }, input, comments), null);
  assert.equal(toGitHubIncident(reported, input, [...comments, {
    body: 'Fixed by restoring capacity in the original zone.', author_association: 'OWNER',
  }])?.resolution, 'Fixed by restoring capacity in the original zone.');
});


test('previews a specific closed issue and reads its comments without requesting the recent issue list', async (context) => {
  const fetch = context.mock.method(globalThis, 'fetch', async (url: URL) => {
    if (url.pathname.endsWith('/comments')) {
      return Response.json([{ body: 'Fixed by restoring the logging configuration.', author_association: 'OWNER' }]);
    }
    return Response.json({ ...issue, state: 'closed', body: 'Log records went missing.', comments: 1 });
  });
  const exactInput = readGitHubInput({ ...input, issueNumber: '#42' });
  const result = await fetchGitHubIncidents(exactInput);
  assert.equal(result.scanned, 1);
  assert.equal(result.incidents[0]?.resolution, 'Fixed by restoring the logging configuration.');
  assert.deepEqual(fetch.mock.calls.map(({ arguments: [url] }) => new URL(String(url)).pathname), [
    '/repos/sample-org/checkout/issues/42', '/repos/sample-org/checkout/issues/42/comments',
  ]);
});

test('keeps results from a batch when one issue comment request fails', async (context) => {
  context.mock.method(globalThis, 'fetch', async (url: URL) => {
    if (url.pathname.endsWith('/comments')) throw new TypeError('Network unavailable');
    return Response.json([issue, { ...issue, id: 99, number: 99, body: 'No fix in description.', comments: 2 }]);
  });
  const result = await fetchGitHubIncidents(input);
  assert.equal(result.scanned, 2);
  assert.equal(result.incidents.length, 1);
  assert.equal(result.incompleteThreads, 1);
  assert.deepEqual(result.skippedIssues, [{ number: 99, reason: 'commentsUnavailable' }]);
});

test('a failed targeted issue request surfaces a network error instead of an empty preview', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Network unavailable'); });
  await assert.rejects(() => fetchGitHubIncidents({ ...input, issueNumber: 42 }), {
    status: 502,
    message: 'Could not reach GitHub to load issues. Check the app server’s network connection to api.github.com.',
  });
});

test('explains why closed GitHub results were skipped', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => Response.json([
    { ...issue, number: 1, pull_request: {} },
    { ...issue, number: 2, state_reason: 'not_planned' },
    { ...issue, number: 3, body: 'Checkout timed out.', comments: 0 },
  ]));
  const result = await fetchGitHubIncidents(input);
  assert.deepEqual(result.incidents, []);
  assert.deepEqual(result.skippedIssues, [
    { number: 1, reason: 'pullRequest' },
    { number: 2, reason: 'notCompleted' },
    { number: 3, reason: 'noDocumentedFix' },
  ]);
});
