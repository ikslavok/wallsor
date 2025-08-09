import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/server/supabase';

export const GET: RequestHandler = async ({ cookies, locals, url }) => {
	try {
		const anonId = locals.anonId;
		const supabase = createSupabaseServerClient(cookies);
		
		// Get pagination parameters
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const offset = (page - 1) * limit;
		
		// Fetch user's sessions - simplified query without enhanced columns for now
		const { data: sessions, error } = await supabase
			.from('canvas_sessions')
			.select(`
				session_id,
				wall_id,
				created_at,
				updated_at,
				walls(
					name,
					slug
				)
			`)
			.eq('creator_anon_id', anonId)
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) {
			console.error('Database error:', error);
			return json({ error: 'Failed to fetch sessions' }, { status: 500 });
		}

		// Transform the data and fetch node counts
		const transformedSessions = await Promise.all(sessions.map(async session => {
			// Get node count for this session
			const { count: nodeCount } = await supabase
				.from('canvas_nodes')
				.select('*', { count: 'exact', head: true })
				.eq('session_id', session.session_id);

			return {
				session_id: session.session_id,
				wall_name: Array.isArray(session.walls) ? session.walls[0]?.name : session.walls?.name || 'Unknown Wall',
				wall_slug: Array.isArray(session.walls) ? session.walls[0]?.slug : session.walls?.slug || 'unknown',
				wall_id: session.wall_id,
				node_count: nodeCount || 0,
				session_bounds: null,
				session_centroid: null,
				is_active: true, // Default for now
				created_at: session.created_at,
				updated_at: session.updated_at,
				finalized_at: null
			};
		}));

		// Filter out sessions with no elements (they shouldn't be displayed)
		const sessionsWithElements = transformedSessions.filter(session => session.node_count > 0);

		return json({
			sessions: sessionsWithElements,
			pagination: {
				page,
				limit,
				hasMore: sessions.length === limit
			}
		});
	} catch (error) {
		console.error('Error fetching user sessions:', error);
		return json({ error: 'Failed to fetch user sessions' }, { status: 500 });
	}
};