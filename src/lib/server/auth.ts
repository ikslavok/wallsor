import type { Cookies } from '@sveltejs/kit';
import { randomUUID, randomBytes } from 'crypto';

const ANON_ID_COOKIE = 'anon_id';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function isValidShortId(id: string): boolean {
  // Check if it's a 12-character hex string (our new format)
  const shortIdRegex = /^[0-9a-f]{12}$/i;
  return shortIdRegex.test(id);
}

function generateShortId(): string {
  // Generate 6 random bytes and convert to hex (12 characters)
  return randomBytes(6).toString('hex');
}

export function getAnonId(cookies: Cookies): string {
  let anonId = cookies.get(ANON_ID_COOKIE);
  
  // If no cookie, invalid format, or old UUID format, generate a new short one
  if (!anonId || (!isValidShortId(anonId) && !isValidUUID(anonId))) {
    anonId = generateShortId();
    cookies.set(ANON_ID_COOKIE, anonId, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE
    });
  } else if (isValidUUID(anonId)) {
    // Migrate old UUID to short format
    anonId = generateShortId();
    cookies.set(ANON_ID_COOKIE, anonId, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE
    });
  }
  
  return anonId;
}

export function clearAnonId(cookies: Cookies) {
  cookies.delete(ANON_ID_COOKIE, { path: '/' });
}