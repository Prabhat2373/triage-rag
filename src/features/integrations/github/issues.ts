import type { IncidentInput } from '@/features/incidents/incident-input';
import { sanitizeText } from '@/features/privacy/redact';

export interface GitHubImportInput {
  owner: string;
  repo: string;
  label: string;
  token: string;
}

export interface GitHubIncident extends IncidentInput {
  sourceUrl: string;
}

export class GitHubImportError extends Error {}

export function readGitHubInput(body: unknown): GitHubImportInput {
  const input = body as Partial<GitHubImportInput> | null;
  const owner = typeof input?.owner === 'string' ? input.owner.trim() : '';
  const repo = typeof input?.repo === 'string' ? input.repo.trim() : '';
  const label = typeof input?.label === 'string' ? input.label.trim() : '';
  const token = typeof input?.token === 'string' ? input.token.trim() : '';
  if (!/^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i.test(owner)
    || !/^[a-z0-9_.-]{1,100}$/i.test(repo) || repo === '.' || repo === '..') {
    throw new GitHubImportError('Enter the GitHub owner and repository name, without the full URL.');
  }
  if (label.length > 50 || label.includes(',')) throw new GitHubImportError('Enter one GitHub label, up to 50 characters.');
  if (token && !/^github_pat_[a-zA-Z0-9_]{1,250}$/.test(token)) {
    throw new GitHubImportError('Use a fine-grained personal access token, or leave it blank for a public repository.');
  }

  return { owner, repo, label, token };
}

interface Issue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state_reason?: string | null;
  pull_request?: object;
  labels: { name: string }[];
}

function splitResolution(body: string) {
  const heading = /^(?:#{1,6}\s+)?(?:\*\*|__)?(?:resolution|fix applied|how it was fixed)(?:\*\*|__)?\s*:?[^\S\r\n]*(?:\r?\n|$)/im.exec(body);
  if (!heading) return null;

  const afterHeading = body.slice(heading.index + heading[0].length);
  const resolution = afterHeading.split(/^#{1,6}\s/m, 1)[0].trim();
  if (!resolution || /^(?:n\/a|none|tbd|not applicable|to do|todo)\.?$/i.test(resolution)) return null;
  return { symptom: body.slice(0, heading.index).trim(), resolution };
}

export function toGitHubIncident(issue: Issue, { owner, repo, label }: GitHubImportInput): GitHubIncident | null {
  if (issue.pull_request || (issue.state_reason && issue.state_reason !== 'completed')) return null;
  if (!Number.isSafeInteger(issue.id) || issue.id < 1 || !Number.isSafeInteger(issue.number) || issue.number < 1) return null;
  if (typeof issue.title !== 'string' || !issue.title.trim() || typeof issue.body !== 'string') return null;
  const sections = splitResolution(issue.body);
  if (!sections) return null;

  const clean = (value: string, length: number) => sanitizeText(value).sanitized.trim().slice(0, length);
  return {
    ticketCode: `GH-${issue.id}`,
    category: clean(label || issue.labels?.[0]?.name || 'GitHub', 100),
    title: clean(issue.title, 250),
    symptom: clean(sections.symptom || issue.title, 2400),
    resolution: clean(sections.resolution, 2400),
    sourceUrl: `https://github.com/${owner}/${repo}/issues/${issue.number}`,
  };
}

export async function fetchGitHubIncidents(input: GitHubImportInput) {
  const url = new URL(`https://api.github.com/repos/${input.owner}/${input.repo}/issues`);
  url.search = new URLSearchParams({
    state: 'closed', sort: 'updated', direction: 'desc', per_page: '30',
    ...(input.label ? { labels: input.label } : {}),
  }).toString();

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(input.token ? { Authorization: `Bearer ${input.token}` } : {}),
      },
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new GitHubImportError('Could not reach GitHub. Check the repository name and try again.');
  }

  if (response.status === 401) throw new GitHubImportError('GitHub rejected the token. Check whether it has expired.');
  if (response.status === 429 || (response.headers.get('x-ratelimit-remaining') === '0' && !response.ok)) {
    throw new GitHubImportError('GitHub’s API limit was reached. Try again later or provide a token for public repositories.');
  }
  if (response.status === 403 || response.status === 404) {
    throw new GitHubImportError('Repository unavailable. Check the owner, repository, token access, and any organization approval requirements.');
  }
  if (!response.ok) throw new GitHubImportError('GitHub could not list issues for this repository.');

  const issues = await response.json() as Issue[];
  if (!Array.isArray(issues)) throw new GitHubImportError('GitHub returned an unexpected response.');
  const incidents = issues.flatMap((issue) => {
    const incident = toGitHubIncident(issue, input);
    return incident ? [incident] : [];
  });
  return { scanned: issues.length, incidents };
}
