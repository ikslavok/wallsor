import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/server/supabase';

export const DELETE: RequestHandler = async ({ params, cookies, locals }) => {
	try {
		const wallId = params.wallId;
		const anonId = locals.anonId;
		
		if (!wallId) {
			return json({ error: 'Wall ID is required' }, { status: 400 });
		}
		
		const supabase = createSupabaseServerClient(cookies);
		
		// Delete the wall (this will cascade to sessions and nodes)
		const { error } = await supabase
			.from('walls')
			.delete()
			.eq('wall_id', wallId)
			.eq('creator_anon_id', anonId); // Ensure user can only delete their own walls

		if (error) {
			console.error('Database error:', error);
			return json({ error: 'Failed to delete wall' }, { status: 500 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting wall:', error);
		return json({ error: 'Failed to delete wall' }, { status: 500 });
	}
};