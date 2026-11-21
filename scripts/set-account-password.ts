import { eq, sql } from 'drizzle-orm';
import { db } from '../src/db';
import { accountSessions, users } from '../src/db/schema';
import { hashPassword, isValidPassword } from '../src/features/accounts/password';

async function setAccountPassword() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!process.env.DATABASE_URL || !email || process.stdin.isTTY) {
    throw new Error('Specify DATABASE_URL and the account email, and pass the password through standard input.');
  }

  process.stdin.setEncoding('utf8');
  let password = '';
  for await (const chunk of process.stdin) {
    password += chunk;
    if (password.length > 130) throw new Error('Use a password of 12 to 128 characters.');
  }
  password = password.replace(/\r?\n$/, '');
  if (!isValidPassword(password)) throw new Error('Use a password of 12 to 128 characters.');

  const passwordHash = await hashPassword(password);
  await db.transaction(async (transaction) => {
    const found = await transaction.select({ id: users.id }).from(users)
      .where(sql`lower(${users.email}) = ${email}`).limit(2);
    if (found.length !== 1) throw new Error('Expected exactly one account with this email.');
    const [{ id }] = found;
    await transaction.update(users).set({
      email, passwordHash, invitationHash: null, invitationExpiresAt: null,
    }).where(eq(users.id, id));
    await transaction.delete(accountSessions).where(eq(accountSessions.userId, id));
  });
}

setAccountPassword().then(() => {
  console.log('Password set and existing sign-in sessions revoked.');
  process.exit(0);
}).catch((error) => {
  console.error(error instanceof Error && !error.cause ? error.message : 'Unable to set the account password.');
  process.exit(1);
});
