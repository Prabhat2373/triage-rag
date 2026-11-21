export const INCIDENT_COLUMNS = [
  { key: 'ticketCode', label: 'Incident ID', aliases: ['ticketcode', 'ticketid'], maxLength: 100 },
  { key: 'category', label: 'Category', aliases: [], maxLength: 100 },
  { key: 'title', label: 'Title', aliases: ['incidentsummary'], maxLength: 250 },
  { key: 'symptom', label: 'What happened', aliases: ['symptom', 'observedsymptom'], maxLength: 2400 },
  { key: 'resolution', label: 'How it was fixed', aliases: ['resolution'], maxLength: 2400 },
] as const;

export const MAX_IMPORT_ROWS = 100;
export const MAX_IMPORT_BYTES = 750 * 1024;

export type IncidentInput = Record<typeof INCIDENT_COLUMNS[number]['key'], string>;

export function validateIncidentField(field: typeof INCIDENT_COLUMNS[number], value: string) {
  if (!value.trim()) return `${field.label} is required.`;
  if (value.length > field.maxLength) {
    return `${field.label} must be at most ${field.maxLength} characters.`;
  }
  return null;
}

export function validateIncident(input: IncidentInput) {
  for (const field of INCIDENT_COLUMNS) {
    const error = validateIncidentField(field, input[field.key]);
    if (error) return error;
  }
  return null;
}
