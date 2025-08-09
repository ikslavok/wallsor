import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { clearAnonId } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies }) => {
  clearAnonId(cookies);
  return json({ success: true, message: 'Cookies cleared' });
};