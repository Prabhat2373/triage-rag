import { importGitHubRequest } from '@/features/integrations/github/import-request';

export async function POST(request: Request) {
  return importGitHubRequest(request);
}
