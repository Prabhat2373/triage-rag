import { cookies } from 'next/headers';
import { db } from '@/db';
import { users, organizations, type User, type Organization } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface AuthContext {
  user: User;
  org: Organization;
  isAdmin: boolean;
  canManageMembers: boolean;
  canManageIntegrations: boolean;
  canDeleteTickets: boolean;
  canIngestTickets: boolean;
  canQueryChat: boolean;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const userIdCookie = cookieStore.get('triage_user_id')?.value;
  if (!userIdCookie) {
    return null;
  }

  const userId = parseInt(userIdCookie, 10);
  if (isNaN(userId)) {
    return null;
  }

  const foundUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (foundUser.length === 0) {
    return null;
  }

  const currentUser = foundUser[0];
  const foundOrg = await db.select().from(organizations).where(eq(organizations.id, currentUser.orgId)).limit(1);
  if (foundOrg.length === 0) {
    return null;
  }

  const currentOrg = foundOrg[0];
  const isAdmin = currentUser.role === 'admin';

  return {
    user: currentUser,
    org: currentOrg,
    isAdmin,
    canManageMembers: isAdmin,
    canManageIntegrations: isAdmin,
    canDeleteTickets: isAdmin,
    canIngestTickets: true,
    canQueryChat: true,
  };
}

export async function getAllUsersAndOrgs() {
  const allUsers = await db.select().from(users);
  const allOrgs = await db.select().from(organizations);
  return { allUsers, allOrgs };
}
