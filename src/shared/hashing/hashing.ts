import * as argon2 from 'argon2';

/**
 * Pure password hashing helpers (argon2id). Kept framework-free so they can be
 * used both via DI ({@link HashingService}) and from standalone scripts (seeders).
 */
export const hashPassword = (plain: string): Promise<string> =>
  argon2.hash(plain, { type: argon2.argon2id });

export const verifyPassword = (hash: string, plain: string): Promise<boolean> =>
  argon2.verify(hash, plain).catch(() => false);
