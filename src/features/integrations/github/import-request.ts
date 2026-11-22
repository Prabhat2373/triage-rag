import { db } from '@/db';
import { githubConnections } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { getAuthContext } from '@/features/accounts/session';
import { saveResolvedIncidents } from '@/features/incidents/save-incidents';
import { fetchGitHubIncidents, GitHubImportError, readGitHubInput } from '@/features/integrations/github/issues';

export async function importGitHubRequest(request: Request) {
  const auth = await getAuthContext();
  if (!auth?.canManageIntegrations) return Response.json({ error: 'Only workspace administrators can import GitHub issues.' }, { status: 403 });
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    return Response.json({ error: 'Expected a JSON request.' }, { status: 415 });
  }

  try {
    const body = await request.json().catch(() => null);
    const input = readGitHubInput(body);
    const { scanned, incidents, incompleteThreads, skippedIssues } = await fetchGitHubIncidents(input);
    const preview = incidents.map(({ ticketCode, title, category, sourceUrl }) => ({ ticketCode, title, category, sourceUrl }));
    if (body.action === 'connect') {
      const { owner, repo, label } = input;
      const settings = { owner, repo, label };
      await db.insert(githubConnections).values({ orgId: auth.org.id, ...settings })
        .onConflictDoUpdate({ target: githubConnections.orgId, set: settings });
      revalidatePath('/integrations');
    }
    if (body.action !== 'import') {
      return Response.json({ scanned, incidents: preview, incompleteThreads, skippedIssues }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (!Array.isArray(body.codes) || body.codes.length < 1 || body.codes.length > 30
      || !body.codes.every((code: unknown) => typeof code === 'string' && /^GH-\d+$/.test(code))) {
      return Response.json({ error: 'Preview the GitHub issues before importing.' }, { status: 400 });
    }
    const eligible = incidents.filter((incident) => body.codes.includes(incident.ticketCode));
    if (eligible.length !== new Set(body.codes).size) {
      if (incompleteThreads) return Response.json({ error: 'GitHub did not return all the previewed threads. Try again, or import one issue by number.' }, { status: 502 });
      return Response.json({ error: 'GitHub issues changed since the preview. Refresh the preview and try again.' }, { status: 409 });
    }
    const result = await saveResolvedIncidents(auth, eligible, 'github');
    if (result.inserted.length || result.updated) revalidatePath('/', 'layout');
    return Response.json({
      scanned, incompleteThreads, incidents: preview.filter(({ ticketCode }) => body.codes.includes(ticketCode)), imported: result.inserted.length, updated: result.updated, skipped: result.skipped,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof GitHubImportError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: 'Unable to finish the GitHub import. Check GitHub access and that PostgreSQL and Ollama are available.' }, { status: 500 });
  }
}
