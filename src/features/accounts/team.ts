import { asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import type { AuthContext } from './session';

export async function listWorkspaceMembers(auth: AuthContext) {
  if (!auth.canManageMembers) return [];

  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    active: sql<boolean>`${users.passwordHash} IS NOT NULL`,
    hasPendingInvitation: sql<boolean>`COALESCE(${users.invitationExpiresAt} > now(), false)`,
  }).from(users).where(eq(users.orgId, auth.org.id)).orderBy(asc(users.name), asc(users.id));
}

export type WorkspaceMember = Awaited<ReturnType<typeof listWorkspaceMembers>>[number];
