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
		
		// Fetch user's walls - simplified query without session join for now
		const { data: walls, error } = await supabase
			.from('walls')
			.select(`
				wall_id,
				name,
				slug,
				created_at,
				last_opened_at
			`)
			.eq('creator_anon_id', anonId)
			.order('last_opened_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) {
			console.error('Database error:', error);
			return json({ error: 'Failed to fetch walls' }, { status: 500 });
		}

		// Fetch session and element counts for each wall
		const transformedWalls = await Promise.all(walls.map(async wall => {
			// Get session count for this wall
			const { data: sessionData, error: sessionError } = await supabase
				.from('canvas_sessions')
				.select('session_id', { count: 'exact' })
				.eq('creator_anon_id', anonId)
				.eq('wall_id', wall.wall_id);

			// Get element count for this wall
			const { data: elementData, error: elementError } = await supabase
				.from('canvas_nodes')
				.select('node_id', { count: 'exact' })
				.eq('creator_anon_id', anonId)
				.eq('wall_id', wall.wall_id);

			const sessionCount = sessionError ? 0 : (sessionData?.length || 0);
			const elementCount = elementError ? 0 : (elementData?.length || 0);

			return {
				wall_id: wall.wall_id,
				name: wall.name,
				slug: wall.slug,
				created_at: wall.created_at,
				last_opened_at: wall.last_opened_at,
				last_activity: wall.last_opened_at || wall.created_at,
				stats: {
					total_sessions: sessionCount,
					active_sessions: 0, // We're not tracking active sessions properly yet
					total_elements: elementCount
				}
			};
		}));

		return json({
			walls: transformedWalls,
			pagination: {
				page,
				limit,
				hasMore: walls.length === limit
			}
		});
	} catch (error) {
		console.error('Error fetching user walls:', error);
		return json({ error: 'Failed to fetch user walls' }, { status: 500 });
	}
};