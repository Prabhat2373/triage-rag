import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectRelevantEvidence } from '../src/features/chat/retrieval/relevance';
import type { SourceItem } from '../src/features/chat/types';

function source(ticketCode: string, title: string, symptom: string, similarity: number): SourceItem {
  return { ticketCode, title, symptom, similarity, category: 'Support', resolution: 'Resolved.' };
}

test('ranks the invoice incident first and hides an unrelated moderate vector match', () => {
  const selected = selectRelevantEvidence('Invoice not loading', [
    source('GH-1', 'Random issue', 'A browser tab was stuck', 0.607),
    source('GH-2', 'Export timeout', 'Invoice exports failed', 0.71),
    source('GH-3', 'Large invoice exports returned HTTP 504', 'Exporting invoices timed out', 0.674),
  ]);
  assert.deepEqual(selected.map(({ ticketCode }) => ticketCode), ['GH-3', 'GH-2']);
});
