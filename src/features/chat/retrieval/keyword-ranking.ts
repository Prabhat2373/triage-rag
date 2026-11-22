import { sql } from 'drizzle-orm';
import { tickets } from '@/db/schema';

export function incidentKeywordRanking(query: string) {
  // Normalize terms with the same PostgreSQL dictionary used for incident text.
  const terms = sql`(SELECT to_tsquery('english', string_agg(quote_literal(term), ' | '))
    FROM unnest(tsvector_to_array(to_tsvector('english', ${query.slice(0, 3000)}))) AS term)`;
  const document = sql`(
    setweight(to_tsvector('english', coalesce(${tickets.title}, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(${tickets.symptom}, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(${tickets.category}, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(${tickets.resolution}, '')), 'D'))`;

  return {
    matches: sql`${document} @@ ${terms}`,
    rank: sql<number>`coalesce(ts_rank(${document}, ${terms}), 0)`,
  };
}
