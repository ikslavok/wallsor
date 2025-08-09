import type { Cookies } from '@sveltejs/kit';
import { randomUUID } from 'crypto';

const ANON_ID_COOKIE = 'anon_id';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function getAnonId(cookies: Cookies): string {
  let anonId = cookies.get(ANON_ID_COOKIE);
  
  // If no cookie or invalid UUID format, generate a new one
  if (!anonId || !isValidUUID(anonId)) {
    anonId = randomUUID();
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