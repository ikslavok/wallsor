import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/server/supabase';

export const PUT: RequestHandler = async ({ params, cookies, locals }) => {
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
		
		// Finalize the session (just update the timestamp for now)
		const { data: session, error } = await supabase
			.from('canvas_sessions')
			.update({
				updated_at: new Date().toISOString()
			})
			.eq('session_id', sessionId)
			.eq('creator_anon_id', anonId) // Ensure user can only finalize their own sessions
			.select()
			.single();

		if (error) {
			console.error('Database error:', error);
			return json({ error: 'Failed to finalize session' }, { status: 500 });
		}

		if (!session) {
			return json({ error: 'Session not found or unauthorized' }, { status: 404 });
		}

		return json({ success: true, session });
	} catch (error) {
		console.error('Error finalizing session:', error);
		return json({ error: 'Failed to finalize session' }, { status: 500 });
	}
};