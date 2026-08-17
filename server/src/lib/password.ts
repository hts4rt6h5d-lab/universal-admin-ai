import argon2 from 'argon2';

// argon2id is the OWASP-recommended variant (resistant to both GPU-cracking
// and side-channel attacks), which is why we don't use bcrypt here.
export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export function verifyPassword(hash: string, plain: string): Promise<boolean> {
  return argon2.verify(hash, plain).catch(() => false);
}

// Minimal strength gate — real product should also check against a
// breached-password list (e.g. HaveIBeenPwned range API) server-side.
export function isPasswordStrongEnough(plain: string): boolean {
  return typeof plain === 'string' && plain.length >= 10;
}
