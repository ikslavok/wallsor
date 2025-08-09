import type { Handle, HandleServerError } from '@sveltejs/kit';
import { getAnonId } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
  // Get or create anonymous user ID
  const anonId = getAnonId(event.cookies);
  
  // Make anonId available in locals
  event.locals.anonId = anonId;
  
  return resolve(event);
};

export const handleError: HandleServerError = ({ error, event }) => {
  console.error('Error on', event.route?.id, error);
  return {
    message: 'Something went wrong'
  };
};