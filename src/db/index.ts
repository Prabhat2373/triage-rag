import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/rag_triage';

// Disable prefetch as it is not supported for "Transaction" pool mode if pgbouncer is used
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
