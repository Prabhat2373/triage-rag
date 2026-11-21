import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

export function isValidPassword(password: unknown): password is string {
  return typeof password === 'string' && password.length >= 12 && password.length <= 128;
}

function deriveKey(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await deriveKey(password, salt);
  return `${salt}:${key.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string | null) {
  // Run the same password check for unknown accounts to reduce timing differences.
  const [salt, expected] = (storedHash ?? `${'0'.repeat(32)}:${'0'.repeat(128)}`).split(':');
  if (!salt || !expected || !/^[a-f0-9]{128}$/.test(expected)) return false;
  const actual = await deriveKey(password, salt);
  return timingSafeEqual(actual, Buffer.from(expected, 'hex')) && storedHash !== null;
}
