import { pgTable, serial, text, timestamp, vector, index, integer, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').references(() => organizations.id).notNull(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').notNull().default('member'), // 'admin' | 'member'
  avatar: text('avatar').notNull().default('https://api.dicebear.com/7.x/bottts/svg?seed=user'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tickets = pgTable(
  'tickets',
  {
    id: serial('id').primaryKey(),
    orgId: integer('org_id').references(() => organizations.id).notNull().default(1),
    ticketCode: text('ticket_code').notNull(),
    category: text('category').notNull(),
    title: text('title').notNull(),
    symptom: text('symptom').notNull(),
    resolution: text('resolution').notNull(),
    embedding: vector('embedding', { dimensions: 768 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('embedding_hnsw_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
    index('ticket_org_idx').on(table.orgId),
  ]
);

export const integrations = pgTable('integrations', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').references(() => organizations.id).notNull(),
  type: text('type').notNull(), // 'slack' | 'teams' | 'pagerduty'
  name: text('name').notNull(),
  webhookUrl: text('webhook_url').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  events: text('events').notNull().default('["incident_ingested", "critical_triage"]'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').references(() => organizations.id).notNull(),
  userId: integer('user_id').references(() => users.id),
  userName: text('user_name').notNull().default('System'),
  userRole: text('user_role').notNull().default('member'),
  action: text('action').notNull(), // 'TICKET_INGEST' | 'CHAT_QUERY' | 'PII_SCRUBBED' | 'INTEGRATION_UPDATE' | 'MEMBER_INVITED'
  details: text('details').notNull(), // JSON string
  ipAddress: text('ip_address').notNull().default('127.0.0.1'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const evaluations = pgTable('evaluations', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').references(() => organizations.id).notNull(),
  userId: integer('user_id').references(() => users.id),
  query: text('query').notNull(),
  modelUsed: text('model_used').notNull(),
  similarityScore: text('similarity_score').notNull(),
  rating: text('rating').notNull(), // 'helpful' | 'unhelpful'
  feedback: text('feedback').default(''),
  latencyMs: integer('latency_ms').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const chatSessions = pgTable(
  'chat_sessions',
  {
    id: serial('id').primaryKey(),
    orgId: integer('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    title: text('title').notNull().default('New Triage Session'),
    model: text('model').notNull().default('qwen3.5:4b'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_chat_sessions_user').on(table.userId, table.updatedAt),
    index('idx_chat_sessions_org').on(table.orgId),
  ]
);

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: serial('id').primaryKey(),
    sessionId: integer('session_id').references(() => chatSessions.id, { onDelete: 'cascade' }).notNull(),
    role: text('role').notNull(), // 'user' | 'assistant'
    content: text('content').notNull(),
    model: text('model'),
    sources: text('sources'), // JSON string of SourceItem[]
    retrievalLatencyMs: integer('retrieval_latency_ms'),
    redactedCount: integer('redacted_count').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_chat_messages_session').on(table.sessionId, table.createdAt),
  ]
);

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  tickets: many(tickets),
  integrations: many(integrations),
  auditLogs: many(auditLogs),
  evaluations: many(evaluations),
  chatSessions: many(chatSessions),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.orgId],
    references: [organizations.id],
  }),
  auditLogs: many(auditLogs),
  evaluations: many(evaluations),
  chatSessions: many(chatSessions),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [chatSessions.orgId],
    references: [organizations.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  organization: one(organizations, {
    fields: [tickets.orgId],
    references: [organizations.id],
  }),
}));

export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
export type Integration = typeof integrations.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Evaluation = typeof evaluations.$inferSelect;
export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
export type ChatMessageRecord = typeof chatMessages.$inferSelect;
export type NewChatMessageRecord = typeof chatMessages.$inferInsert;
