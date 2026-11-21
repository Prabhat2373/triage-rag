import { getAuthContext } from '@/features/accounts/session';
import { createIncidentTemplate } from '@/features/incidents/excel-import';

export async function GET() {
  const auth = await getAuthContext();
  if (!auth?.canIngestTickets) return new Response(null, { status: 403 });

  const workbook = await createIncidentTemplate();
  return new Response(workbook, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="resolved-incidents.xlsx"',
      'Cache-Control': 'private, no-store',
    },
  });
}
