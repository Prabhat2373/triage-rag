import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { tickets } from '@/db/schema';
import { detectPromptInjection, sanitizeText } from '@/features/privacy/redact';

export interface IncidentSuggestion {
  id: number;
  title: string;
  category: string;
  query: string;
}

const MAX_SUGGESTIONS = 4;

function clean(value: string) {
  return sanitizeText(value).sanitized.replace(/\s+/g, ' ').trim();
}

export async function getIncidentSuggestions(orgId: number) {
  const recent = await db.select({
    id: tickets.id,
    title: tickets.title,
    category: tickets.category,
    symptom: tickets.symptom,
  }).from(tickets)
    .where(eq(tickets.orgId, orgId))
    .orderBy(desc(tickets.createdAt), desc(tickets.id))
    .limit(24);

  const usedTitles = new Set<string>();
  const usedCategories = new Set<string>();
  const suggestions: IncidentSuggestion[] = [];
  const otherSuggestions: IncidentSuggestion[] = [];

  for (const record of recent) {
    const title = clean(record.title);
    const symptom = clean(record.symptom);
    const titleKey = title.toLowerCase();
    if (!title || !symptom || usedTitles.has(titleKey)) continue;

    const query = `How was this incident resolved? ${title}\n\nWhat happened: ${symptom}`;
    if (detectPromptInjection(query).isSuspicious) continue;
    usedTitles.add(titleKey);

    const category = clean(record.category);
    const suggestion = { id: record.id, title, category, query };
    const categoryKey = category.toLowerCase();
    if (usedCategories.has(categoryKey)) {
      otherSuggestions.push(suggestion);
    } else {
      usedCategories.add(categoryKey);
      suggestions.push(suggestion);
      if (suggestions.length === MAX_SUGGESTIONS) break;
    }
  }

  return {
    hasIncidents: recent.length > 0,
    suggestions: [...suggestions, ...otherSuggestions].slice(0, MAX_SUGGESTIONS),
  };
}

export type IncidentSuggestionState = Awaited<ReturnType<typeof getIncidentSuggestions>>;
