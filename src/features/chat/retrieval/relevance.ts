import type { SourceItem } from '../types';

const genericWords = new Set([
  'a', 'an', 'and', 'are', 'can', 'could', 'does', 'else', 'error', 'for', 'had', 'how',
  'issue', 'not', 'our', 'please', 'problem', 'related', 'should', 'the', 'this', 'was',
  'what', 'when', 'which', 'why', 'with', 'would', 'any', 'anything', 'check', 'able',
  'follow', 'happen', 'help', 'next', 'try', 'work', 'verify', 'fix', 'resolve', 'get',
]);

function terms(value: string) {
  return new Set((value.toLowerCase().match(/[a-z\d]+/g) ?? [])
    .filter((word) => !genericWords.has(word))
    .map((word) => word.length > 4 ? word.replace(/(?:ing|ed|s)$/, '').replace(/e$/, '') : word)
    .filter((word) => word.length > 1 && !genericWords.has(word)));
}

// Semantic similarity alone can give a broad, unrelated incident a middling score.
export function selectRelevantEvidence(query: string, sources: SourceItem[]) {
  const queryTerms = terms(query);
  if (!queryTerms.size) return sources.filter((source) => source.similarity >= 0.76).slice(0, 3);

  return sources.flatMap((source, index) => {
    const titleTerms = terms(source.title);
    const detailTerms = terms(`${source.category} ${source.symptom}`);
    let overlap = 0;
    for (const term of queryTerms) {
      if (titleTerms.has(term)) overlap += 2;
      else if (detailTerms.has(term)) overlap += 1;
    }
    if (!overlap && (source.matchKind === 'keyword' || source.similarity < 0.76)) return [];
    return [{ source, score: overlap + source.similarity, index }];
  }).sort((first, second) => second.score - first.score || first.index - second.index)
    .slice(0, 3).map(({ source }) => source);
}
