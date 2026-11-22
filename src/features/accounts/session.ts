import { isDemoMode } from '@/features/demo/config';
import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { accountSessions, users, organizations, type User, type Organization } from '@/db/schema';
import { and, eq, gt } from 'drizzle-orm';

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

const SESSION_COOKIE = 'triage_session';
const SESSION_AGE_SECONDS = 60 * 60 * 24 * 7;

function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function startSession(account: number | ((transaction: DatabaseTransaction) => Promise<number>)) {
  const cookieStore = await cookies();
  const previousToken = cookieStore.get(SESSION_COOKIE)?.value;
  const token = randomBytes(32).toString('base64url');
  await db.transaction(async (transaction) => {
    // Apply any account changes in the same transaction as the new session.
    const userId = typeof account === 'number' ? account : await account(transaction);
    if (previousToken) {
      await transaction.delete(accountSessions).where(eq(accountSessions.tokenHash, hashSessionToken(previousToken)));
    }
    await transaction.insert(accountSessions).values({
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_AGE_SECONDS * 1000),
    });
  });
  cookieStore.set(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_AGE_SECONDS,
  });
}

export async function endSession() {
  if (isDemoMode()) return;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(accountSessions).where(eq(accountSessions.tokenHash, hashSessionToken(token)));
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getAuthContext(): Promise<AuthContext | null> {
  if (isDemoMode()) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;

  // Only the fields needed by the dashboard can leave this query.
  const [account] = await db.select({
    user: {
      id: users.id,
      orgId: users.orgId,
      name: users.name,
      email: users.email,
      role: users.role,
      avatar: users.avatar,
      createdAt: users.createdAt,
    },
    org: organizations,
  })
    .from(accountSessions)
    .innerJoin(users, eq(users.id, accountSessions.userId))
    .innerJoin(organizations, eq(organizations.id, users.orgId))
    .where(and(eq(accountSessions.tokenHash, hashSessionToken(token)), gt(accountSessions.expiresAt, new Date())))
    .limit(1);

  if (!account) return null;
  const { user: currentUser, org: currentOrg } = account;
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
