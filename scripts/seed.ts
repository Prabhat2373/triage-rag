import { embedMany } from 'ai';
import { getLocalEmbeddingModel } from '../src/features/chat/models/providers/ollama';
import { db } from '../src/db';
import { tickets } from '../src/db/schema';
import fs from 'node:fs';
import path from 'node:path';

interface TicketData {
  ticketCode: string;
  category: string;
  title: string;
  symptom: string;
  resolution: string;
}

async function seed() {
  console.log('🌱 Starting TriageRAG knowledge base seeding...');

  const ticketsPath = path.join(process.cwd(), 'data', 'tickets.json');
  if (!fs.existsSync(ticketsPath)) {
    throw new Error(`Data file not found at: ${ticketsPath}`);
  }

  const raw = fs.readFileSync(ticketsPath, 'utf-8');
  const ticketList: TicketData[] = JSON.parse(raw);
  console.log(`Loaded ${ticketList.length} tickets from ${ticketsPath}`);

  // Combine Title, Symptom, and Resolution into a single string per ticket
  const combinedTexts = ticketList.map(
    (t) => `Title: ${t.title}\nSymptom: ${t.symptom}\nResolution: ${t.resolution}`
  );

  console.log('Generating embeddings with Ollama (nomic-embed-text)...');
  const { embeddings } = await embedMany({
    model: getLocalEmbeddingModel(),
    values: combinedTexts,
  });

  console.log(`Generated ${embeddings.length} embeddings. Clearing existing tickets...`);
  await db.delete(tickets);

  console.log('Inserting tickets with embeddings into PostgreSQL...');
  const rows = ticketList.map((t, idx) => ({
    ticketCode: t.ticketCode,
    category: t.category,
    title: t.title,
    symptom: t.symptom,
    resolution: t.resolution,
    embedding: embeddings[idx],
  }));

  await db.insert(tickets).values(rows);
  console.log('✅ Seeding completed successfully! 25 tickets indexed.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
