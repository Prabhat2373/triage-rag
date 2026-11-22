import type { IncidentRecord } from '@/features/incidents/incident-records';
import { sampleIncidentGroups } from './sample-incidents';

const featured = [
  {
    title: 'Invoice exports timed out',
    category: 'Billing',
    symptom: 'Exporting more than 10,000 invoices returned HTTP 504. Smaller downloads still worked.',
    resolution: 'Moved large invoice exports to a background job. The billing page now shows export progress and offers a download when the file is ready. Verified that both small and large exports completed.',
    aliases: 'invoice export invoice not loading gateway timeout 504',
  },
  {
    title: 'VM creation returned HTTP 500',
    category: 'Infrastructure',
    symptom: 'Creating a virtual machine failed with a capacity error in the selected zone.',
    resolution: 'Created the VM in a zone with available capacity and verified that it booted. The team added a capacity check before retrying provisioning.',
    aliases: 'vm virtual machine provisioning no resources available',
  },
  {
    title: 'Customers were signed out in a second tab',
    category: 'Authentication',
    symptom: 'Two open tabs refreshed the same session token at once, which signed the customer out.',
    resolution: 'Coordinated token refresh across tabs so one tab refreshes the session and the others reuse the result. Verified that both tabs stayed signed in when the original session expired.',
    aliases: 'unexpected sign outs logged out second tab token refresh',
  },
  {
    title: 'Checkout returned HTTP 503 after a deployment',
    category: 'Checkout',
    symptom: 'Checkout requests failed after a deployment reduced the database connection pool. Browsing and cart updates still worked.',
    resolution: 'Restored the previous connection pool setting and restarted the checkout service. Verified that test purchases returned HTTP 200 and pool timeouts stopped.',
    aliases: 'checkout connection pool 503',
  },
];

const samples = [
  ...featured,
  ...Object.entries(sampleIncidentGroups).flatMap(([category, entries]) =>
    entries.map((entry) => {
      const [title, symptom, resolution, aliases = ''] = entry;
      return { title, category, symptom, resolution, aliases };
    })
  ),
];

export const demoIncidents: IncidentRecord[] = samples.map(({ title, category, symptom, resolution }, index) => ({
  id: index + 1,
  ticketCode: `TKT-${9001 + index}`,
  title,
  category,
  symptom,
  resolution,
  sourceUrl: null,
  // Fixed fictional dates, with the featured records first in the sample timeline.
  createdAt: new Date(Date.UTC(2026, 0, 56 - index)),
}));

const commonWords = new Set('a an and are after about can could did do does during error failed failure for from had has have how i in is it my not of on our returned stopped the their this to was we were what when why with worked working you'.split(' '));

function searchTerms(text: string) {
  return new Set((text.toLowerCase().normalize('NFKD').match(/[a-z0-9]+/g) ?? [])
    .map((word) => word.length > 4 ? word.replace(/(?:ies|s)$/, (suffix) => suffix === 'ies' ? 'y' : '') : word)
    .filter((word) => word.length > 1 && !commonWords.has(word)));
}

const searchIndex = samples.map(({ title, symptom, aliases }) => ({
  primary: searchTerms(`${title} ${aliases}`),
  secondary: searchTerms(symptom),
}));

export function listRecentDemoEvidence(query: string) {
  const requestedCount = query.match(/\b(?:latest|recent|last|newest|most recent) +([1-9]\d*) +/i)
    ?? query.match(/\b([1-9]\d*) +(?:latest|recent|newest|most recent) +/i);
  const recentIncidents = /\b(?:recent|latest|last|newest)\s+(?:[1-9]\d*\s+)?(?:resolved\s+)?incidents\b/i;
  if (!recentIncidents.test(query) || /\bTKT-\d+\b/i.test(query)) return undefined;

  const limit = Math.min(Number(requestedCount?.[1] ?? 5), 10);
  return [...demoIncidents]
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, limit)
    .map(({ ticketCode, title, category, symptom, resolution, createdAt }) => ({
      ticketCode, title, category, symptom, resolution,
      similarity: 0,
      sampleDate: createdAt.toISOString().slice(0, 10),
    }));
}

export function findDemoEvidence(query: string) {
  const requestedCodes = new Set(query.toUpperCase().match(/\bTKT-\d+\b/g));
  const terms = [...searchTerms(query)];
  if (!terms.length) return [];
  const minimumMatches = Math.min(terms.length, Math.max(2, Math.ceil(terms.length / 3)));
  const matches = demoIncidents.flatMap((incident, index) => {
    const { primary, secondary } = searchIndex[index];
    const primaryMatches = terms.filter((term) => primary.has(term)).length;
    const secondaryMatches = terms.filter((term) => !primary.has(term) && secondary.has(term)).length;
    const matched = primaryMatches + secondaryMatches;
    const matchesQuery = requestedCodes.size
      ? requestedCodes.has(incident.ticketCode)
      : primaryMatches > 0 && matched >= minimumMatches;
    if (!matchesQuery) return [];

    const { ticketCode, title, category, symptom, resolution } = incident;
    return [{
      score: primaryMatches * 3 + secondaryMatches,
      source: { ticketCode, title, category, symptom, resolution, similarity: 0, matchKind: 'keyword' as const },
    }];
  }).sort((left, right) => right.score - left.score);

  const best = matches[0]?.score ?? 0;
  return matches.filter(({ score }) => score >= best * 0.75).slice(0, 3).map(({ source }) => source);
}
