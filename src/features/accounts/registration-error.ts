import { readDatabaseFailure } from '@/db/error';

export function describeRegistrationFailure(error: unknown) {
  const { code, constraint } = readDatabaseFailure(error);
  if (code === '23505' && (constraint === 'users_email_unique' || constraint === 'users_email_key')) {
    return { code, reason: 'email-conflict', message: 'This email already belongs to an account. Sign in to continue.' };
  }
  if (code === '42P01' || code === '42703'
    || (code === '23505' && (constraint === 'users_pkey' || constraint === 'organizations_pkey'))) {
    return {
      code,
      reason: 'database-setup',
      message: 'The workspace database needs setup or an upgrade. Ask the administrator to run the account migration.',
    };
  }
  if (code.startsWith('08') || ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'CONNECT_TIMEOUT', 'ECONNRESET'].includes(code)) {
    return { code, reason: 'database-connection', message: 'The workspace database is unavailable. Try again when it is online.' };
  }
  return { code, reason: 'unexpected', message: 'Unable to create the workspace. Please try again or contact your administrator.' };
}
