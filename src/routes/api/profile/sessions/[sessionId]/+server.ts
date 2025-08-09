import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/server/supabase';

export const DELETE: RequestHandler = async ({ params, cookies, locals }) => {
	try {
		const sessionId = params.sessionId;
		const anonId = locals.anonId;
		
		if (!sessionId) {
			return json({ error: 'Session ID is required' }, { status: 400 });
		}
		
		const supabase = createSupabaseServerClient(cookies);
		
		// Set the current user context for RLS
		await supabase.rpc('set_config', {
			setting_name: 'app.current_user_id',
			setting_value: anonId
		});
		
		// Delete the session and all associated nodes (cascading)
		const { error } = await supabase
			.from('canvas_sessions')
			.delete()
			.eq('session_id', sessionId)
			.eq('creator_anon_id', anonId); // Ensure user can only delete their own sessions

		if (error) {
			console.error('Database error:', error);
			return json({ error: 'Failed to delete session' }, { status: 500 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting session:', error);
		return json({ error: 'Failed to delete session' }, { status: 500 });
	}
};