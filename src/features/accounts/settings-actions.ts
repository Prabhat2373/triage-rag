'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { accountSessions, organizations, users } from '@/db/schema';
import { logAuditEvent } from '@/features/audit/log-event';
import { hashPassword, isValidPassword, verifyPassword } from './password';
import { getAuthContext, startSession } from './session';

export async function updateMemberRole(memberId: number, role: 'admin' | 'member') {
  const auth = await getAuthContext();
  if (!auth?.canManageMembers) return { success: false, error: 'Only workspace administrators can change roles.' };
  if (!Number.isInteger(memberId) || memberId < 1 || memberId > 2_147_483_647
    || (role !== 'admin' && role !== 'member')) {
    return { success: false, error: 'Select a valid team member and role.' };
  }
  if (memberId === auth.user.id) return { success: false, error: 'Another administrator can change your role.' };

  try {
    const change = await db.transaction(async (transaction) => {
      // Serialize role changes per workspace, then recheck the acting administrator.
      await transaction.select({ id: organizations.id }).from(organizations)
        .where(eq(organizations.id, auth.org.id)).for('update');
      const [actor] = await transaction.select({ role: users.role }).from(users)
        .where(and(eq(users.id, auth.user.id), eq(users.orgId, auth.org.id)));
      if (actor?.role !== 'admin') return { error: 'Only workspace administrators can change roles.' };

      const memberScope = and(eq(users.id, memberId), eq(users.orgId, auth.org.id));
      const [member] = await transaction.select({ id: users.id, role: users.role }).from(users)
        .where(memberScope).for('update');
      if (!member) return { error: 'Team member not found.' };
      if (member.role === role) return { changed: false };

      await transaction.update(users).set({ role }).where(memberScope);
      return { changed: true, previousRole: member.role };
    });

    if (change.error) return { success: false, error: change.error };
    if (change.changed) {
      await logAuditEvent({
        orgId: auth.org.id,
        userId: auth.user.id,
        userName: auth.user.name,
        userRole: auth.user.role,
        action: 'ROLE_CHANGED',
        details: { memberId, previousRole: change.previousRole, role },
      });
    }
    revalidatePath('/settings/team');
    return { success: true };
  } catch {
    return { success: false, error: 'Unable to update the role. Please try again.' };
  }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Sign in to change your password.' };
  if (!isValidPassword(currentPassword) || !isValidPassword(newPassword)) {
    return { success: false, error: 'Enter your current password and a new password of 12 to 128 characters.' };
  }
  if (currentPassword === newPassword) return { success: false, error: 'Choose a different password.' };

  try {
    const [account] = await db.select({ passwordHash: users.passwordHash }).from(users)
      .where(eq(users.id, auth.user.id));
    const previousHash = account?.passwordHash;
    if (!previousHash || !(await verifyPassword(currentPassword, previousHash))) {
      return { success: false, error: 'Your current password is incorrect.' };
    }
    const passwordHash = await hashPassword(newPassword);

    // Update credentials, revoke old sessions and create this device's replacement in one transaction.
    await startSession(async (transaction) => {
      const [updated] = await transaction.update(users).set({ passwordHash })
        .where(and(eq(users.id, auth.user.id), eq(users.passwordHash, previousHash)))
        .returning({ id: users.id });
      if (!updated) throw new Error('Password already updated');
      await transaction.delete(accountSessions).where(eq(accountSessions.userId, updated.id));
      return updated.id;
    });

    await logAuditEvent({
      orgId: auth.org.id,
      userId: auth.user.id,
      userName: auth.user.name,
      userRole: auth.user.role,
      action: 'PASSWORD_CHANGED',
      details: { message: 'Password changed and previous sessions revoked.' },
    });
    return { success: true };
  } catch {
    return { success: false, error: 'Unable to change your password. Please try again.' };
  }
}
