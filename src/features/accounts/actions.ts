'use server';

import { revalidatePath } from 'next/cache';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { db } from '@/db';
import { users, organizations } from '@/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { getAuthContext, startSession, endSession } from './session';
import { describeRegistrationFailure } from './registration-error';
import { prepareAvatar } from './prepare-avatar';
import { hashPassword, verifyPassword, isValidPassword } from './password';
import { logAuditEvent } from '@/features/audit/log-event';

export async function loginAction(email: string, password: string) {
  const invalidCredentials = { success: false as const, error: 'Invalid email or password.' };
  if (typeof email !== 'string' || email.length > 254 || !isValidPassword(password)) {
    return invalidCredentials;
  }

  try {
    const [user] = await db.select({
      id: users.id,
      orgId: users.orgId,
      name: users.name,
      role: users.role,
      passwordHash: users.passwordHash,
    }).from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1);

    const passwordHash = user?.passwordHash ?? null;
    if (!(await verifyPassword(password, passwordHash)) || !user || !passwordHash) {
      return invalidCredentials;
    }

    await startSession(async (transaction) => {
      const [current] = await transaction.select({ id: users.id }).from(users)
        .where(and(eq(users.id, user.id), eq(users.passwordHash, passwordHash))).for('update');
      if (!current) throw new Error('Credentials changed during sign-in');
      return current.id;
    });
    await logAuditEvent({
      orgId: user.orgId,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'USER_LOGIN',
      details: { message: 'User signed in.' },
    });
    return { success: true as const };
  } catch (error) {
    console.error('Sign-in failed', error instanceof Error ? error.name : 'Unknown error');
    return { success: false as const, error: 'Unable to sign in.' };
  }
}

function isValidName(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 120;
}

function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export async function registerAction(data: {
  name: string;
  email: string;
  orgName: string;
  password: string;
}) {
  if (!data || !isValidName(data.name) || !isValidName(data.orgName)
    || !isValidEmail(data.email) || !isValidPassword(data.password)) {
    return { success: false, error: 'Enter a name, organization, valid email, and a password of 12 to 128 characters.' };
  }

  try {
    const passwordHash = await hashPassword(data.password);
    await startSession(async (transaction) => {
      const name = data.orgName.trim();
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const [org] = await transaction.insert(organizations).values({
        name,
        slug: `${slug || 'workspace'}-${randomUUID()}`,
      }).returning({ id: organizations.id });
      const [user] = await transaction.insert(users).values({
        orgId: org.id,
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        passwordHash,
        role: 'admin',
      }).returning({ id: users.id });
      return user.id;
    });

    return { success: true as const };
  } catch (error) {
    const failure = describeRegistrationFailure(error);
    if (failure.reason !== 'email-conflict') {
      console.error('Workspace registration failed', { reason: failure.reason, code: failure.code });
    }
    return { success: false, error: failure.message };
  }
}

export async function logoutAction() {
  await endSession();
}

/**
 * Update user profile
 */
export async function updateProfileAction(formData: FormData) {
  const auth = await getAuthContext();
  if (!auth) return { success: false as const, error: 'Sign in to update your profile.' };

  const name = formData.get('name');
  if (!isValidName(name)) return { success: false as const, error: 'Enter a display name.' };

  const file = formData.get('avatar');
  let avatar: string | undefined;
  if (file !== null) {
    if (!(file instanceof File)) return { success: false as const, error: 'Choose an image for your profile photo.' };
    try {
      avatar = await prepareAvatar(file);
    } catch (error) {
      return { success: false as const, error: error instanceof Error ? error.message : 'Unable to read your image.' };
    }
  }

  try {
    await db.update(users).set({ name: name.trim(), avatar }).where(eq(users.id, auth.user.id));
    revalidatePath('/', 'layout');
    return { success: true as const, avatar };
  } catch {
    return { success: false as const, error: 'Unable to update your profile. Please try again.' };
  }
}

function invitationDigest(code: string) {
  return createHash('sha256').update(code).digest('hex');
}

export async function inviteTeamMember(data: { name: string; email: string; role: 'admin' | 'member' }) {
  const auth = await getAuthContext();
  if (!auth?.canManageMembers) return { success: false, error: 'Only administrators can invite team members.' };

  if (!data || !isValidName(data.name) || !isValidEmail(data.email) || !['admin', 'member'].includes(data.role)) {
    return { success: false, error: 'Enter a name, valid email, and role.' };
  }

  const code = randomBytes(32).toString('base64url');

  try {
    const invitation = {
      name: data.name.trim(),
      role: data.role,
      invitationHash: invitationDigest(code),
      invitationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
    const [recipient] = await db.insert(users).values({
      ...invitation,
      orgId: auth.org.id,
      email: data.email.trim().toLowerCase(),
    }).onConflictDoUpdate({
      target: users.email,
      set: invitation,
      setWhere: and(eq(users.orgId, auth.org.id), isNull(users.passwordHash)),
    }).returning({ id: users.id });
    if (!recipient) return { success: false, error: 'This email already belongs to an account.' };

    await logAuditEvent({
      orgId: auth.org.id,
      userId: auth.user.id,
      userName: auth.user.name,
      userRole: auth.user.role,
      action: 'MEMBER_INVITED',
      details: { name: data.name, email: data.email, role: data.role },
    });

    revalidatePath('/settings/team');
    return { success: true as const, code };
  } catch {
    return { success: false, error: 'Unable to invite this team member. Check whether the email is already registered.' };
  }
}

export async function acceptInvitation(email: string, code: string, password: string) {
  const invalid = { success: false, error: 'The invitation is invalid or has expired.' };
  if (!isValidEmail(email) || typeof code !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(code)
    || !isValidPassword(password)) return invalid;

  const pendingInvitation = and(
    eq(users.email, email.trim().toLowerCase()),
    eq(users.invitationHash, invitationDigest(code)),
    isNull(users.passwordHash),
    sql`${users.invitationExpiresAt} > now()`,
  );

  try {
    const [pendingUser] = await db.select({ id: users.id }).from(users).where(pendingInvitation).limit(1);
    if (!pendingUser) return invalid;

    // Redeem the code and set the password in one write so it can only be used once.
    const [user] = await db.update(users).set({
      passwordHash: await hashPassword(password),
      invitationHash: null,
      invitationExpiresAt: null,
    }).where(and(eq(users.id, pendingUser.id), pendingInvitation)).returning({ id: users.id });

    if (!user) return invalid;
    await startSession(user.id);
    return { success: true as const };
  } catch {
    return { success: false, error: 'Unable to accept this invitation.' };
  }
}
