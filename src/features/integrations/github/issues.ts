import { extractDocumentedResolution } from '../documented-resolution';
import type { IncidentInput } from '@/features/incidents/incident-input';
import { sanitizeText } from '@/features/privacy/redact';

export interface GitHubImportInput {
  owner: string;
  repo: string;
  label: string;
  token: string;
  issueNumber?: number;
}

export interface GitHubIncident extends IncidentInput {
  sourceUrl: string;
}

export class GitHubImportError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

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

  const rawIssueNumber = (body as { issueNumber?: unknown } | null)?.issueNumber;
  let issueNumber: number | undefined;
  if (rawIssueNumber != null && rawIssueNumber !== '') {
    const value = typeof rawIssueNumber === 'string' ? rawIssueNumber.trim().replace(/^#/, '') : '';
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
      throw new GitHubImportError('Enter a valid GitHub issue number.');
    }
    issueNumber = Number(value);
  }

  return { owner, repo, label, token, issueNumber };
}

interface Issue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state?: 'open' | 'closed';
  state_reason?: string | null;
  pull_request?: object;
  labels: { name: string }[];
  comments?: number;
  user?: { login: string } | null;
}

interface IssueComment {
  body: string;
  author_association?: string;
  user?: { login: string } | null;
}

type SkipReason = 'pullRequest' | 'notCompleted' | 'invalidIssue' | 'noDocumentedFix' | 'commentsUnavailable';

function getEligibilityProblem(issue: Issue): SkipReason | undefined {
  if (issue.pull_request) return 'pullRequest';
  if (issue.state === 'open' || (issue.state_reason && issue.state_reason !== 'completed')) return 'notCompleted';
  if (!Number.isSafeInteger(issue.id) || issue.id <= 0
    || !Number.isSafeInteger(issue.number) || issue.number <= 0
    || typeof issue.title !== 'string' || !issue.title.trim()) return 'invalidIssue';
}

export function toGitHubIncident(issue: Issue, { owner, repo, label }: GitHubImportInput, comments: IssueComment[] = []): GitHubIncident | null {
  if (getEligibilityProblem(issue)) return null;
  const description = issue.body ?? '';
  const fromDescription = extractDocumentedResolution(description);
  let fromParticipant: string | undefined;
  let fromTrustedComment: string | undefined;
  for (const comment of [...comments].reverse()) {
    if (typeof comment.body !== 'string') continue;
    const documented = extractDocumentedResolution(comment.body, true);
    if (!documented) continue;
    const author = comment.user?.login;
    const trusted = Boolean(author && author === issue.user?.login)
      || ['OWNER', 'MEMBER', 'COLLABORATOR'].includes(comment.author_association ?? '');
    if (trusted) {
      fromTrustedComment = documented.resolution;
      break;
    }
    if (issue.state_reason === 'completed') fromParticipant ??= documented.resolution;
  }
  const resolution = fromTrustedComment ?? fromDescription?.resolution ?? fromParticipant;
  if (!resolution) return null;

  const clean = (value: string, length: number) => sanitizeText(value).sanitized.trim().slice(0, length);
  return {
    ticketCode: `GH-${issue.id}`,
    category: clean(label || issue.labels?.[0]?.name || 'GitHub', 100),
    title: clean(issue.title, 250),
    symptom: clean((fromDescription?.summary ?? description.trim()) || issue.title, 2400),
    resolution: clean(resolution, 2400),
    sourceUrl: `https://github.com/${owner}/${repo}/issues/${issue.number}`,
  };
}

async function readGitHubJson(url: URL, input: GitHubImportInput): Promise<unknown> {
  const timeout = AbortSignal.timeout(10_000);
  const isCommentsRequest = url.pathname.endsWith('/comments');
  const requestTarget = isCommentsRequest ? 'issue comments' : 'issues';
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
      signal: timeout,
    });
  } catch {
    if (timeout.aborted) {
      throw new GitHubImportError(`GitHub timed out while loading ${requestTarget}. Try again or check whether the app server can reach api.github.com.`, 504);
    }
    throw new GitHubImportError(`Could not reach GitHub to load ${requestTarget}. Check the app server’s network connection to api.github.com.`, 502);
  }

  if (response.status === 401) throw new GitHubImportError('GitHub rejected the token. Check whether it has expired.');
  if (response.status === 429 || (!response.ok && (response.headers.get('x-ratelimit-remaining') === '0' || response.headers.has('retry-after')))) {
    throw new GitHubImportError('GitHub’s API limit was reached. Try again later or provide a token for public repositories.', 429);
  }
  if (response.status === 403 || response.status === 404) {
    throw new GitHubImportError('Repository unavailable. Check the owner, repository, token access, and any organization approval requirements.');
  }
  if (!response.ok) throw new GitHubImportError(`GitHub could not load ${requestTarget}.`, 502);

  try {
    return await response.json();
  } catch {
    if (timeout.aborted) throw new GitHubImportError(`GitHub timed out while downloading ${requestTarget}.`, 504);
    throw new GitHubImportError(`GitHub returned an unreadable response for ${requestTarget}.`, 502);
  }
}

async function readGitHubList<T>(url: URL, input: GitHubImportInput): Promise<T[]> {
  const data = await readGitHubJson(url, input);
  if (!Array.isArray(data)) throw new GitHubImportError('GitHub returned an unexpected response.');
  return data;
}

export async function fetchGitHubIncidents(input: GitHubImportInput) {
  const base = `https://api.github.com/repos/${input.owner}/${input.repo}/issues`;
  const url = new URL(base);
  url.search = new URLSearchParams({
    state: 'closed', sort: 'updated', direction: 'desc', per_page: '30',
    ...(input.label ? { labels: input.label } : {}),
  }).toString();

  let issues: Issue[];
  if (input.issueNumber !== undefined) {
    const issue = await readGitHubJson(new URL(`${base}/${input.issueNumber}`), input) as Issue | null;
    if (!issue || issue.number !== input.issueNumber) throw new GitHubImportError('GitHub returned an unexpected issue.');
    if (getEligibilityProblem(issue) || issue.state !== 'closed') {
      throw new GitHubImportError(`Issue #${input.issueNumber} must be a closed issue marked Completed.`);
    }
    issues = [issue];
  } else {
    issues = await readGitHubList<Issue>(url, input);
  }
  const skippedIssues: { number?: number; reason: SkipReason }[] = [];
  const eligible = issues.filter((issue) => {
    const reason = getEligibilityProblem(issue);
    if (!reason) return true;
    skippedIssues.push({ number: Number.isSafeInteger(issue.number) ? issue.number : undefined, reason });
    return false;
  });
  const incidents: GitHubIncident[] = [];
  let incompleteThreads = 0;
  for (let start = 0; start < eligible.length; start += 4) {
    const batch = await Promise.all(eligible.slice(start, start + 4).map(async (issue) => {
      // Use a documented description when available to save API requests.
      const conversionInput = input.issueNumber === undefined ? input : { ...input, label: '' };
      const documented = toGitHubIncident(issue, conversionInput);
      if (documented) return { incident: documented };
      if (!issue.comments) return { reason: 'noDocumentedFix' as const };

      const commentsUrl = new URL(`${base}/${issue.number}/comments`);
      commentsUrl.searchParams.set('per_page', '100');
      commentsUrl.searchParams.set('page', String(Math.ceil(issue.comments / 100)));
      try {
        const comments = await readGitHubList<IssueComment>(commentsUrl, input);
        const incident = toGitHubIncident(issue, conversionInput, comments);
        return incident ? { incident } : { reason: 'noDocumentedFix' as const };
      } catch (error) {
        if (input.issueNumber !== undefined || !(error instanceof GitHubImportError) || error.status < 500) throw error;
        incompleteThreads++;
        return { reason: 'commentsUnavailable' as const };
      }
    }));
    batch.forEach(({ incident, reason }, index) => {
      if (incident) incidents.push(incident);
      if (reason) skippedIssues.push({ number: eligible[start + index].number, reason });
    });
  }
  return { scanned: issues.length, incidents, incompleteThreads, skippedIssues };
}
