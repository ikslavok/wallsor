import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { clearAnonId } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies }) => {
	try {
		// Clear the existing anonymous ID cookie
		// This will cause a new ID to be generated on the next request
		clearAnonId(cookies);
		
		return json({ 
			success: true, 
			message: 'Anonymous ID reset successfully. You will receive a new ID on your next request.' 
		});
	} catch (error) {
		console.error('Error resetting anonymous ID:', error);
		return json({ error: 'Failed to reset anonymous ID' }, { status: 500 });
	}
};