import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/server/supabase';
import { z } from 'zod';

const CreateSessionSchema = z.object({
	wall_id: z.string().uuid(),
});

const GetSessionsSchema = z.object({
	wall_id: z.string().uuid()
});

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	try {
		const body = await request.json();
		const parsed = CreateSessionSchema.parse(body);
		const anonId = locals.anonId;
		
		const supabase = createSupabaseServerClient(cookies);
		
		// Create new canvas session
		const { data: session, error } = await supabase
			.from('canvas_sessions')
			.insert({
				wall_id: parsed.wall_id,
				creator_anon_id: anonId
			})
			.select()
			.single();

		if (error) {
			console.error('Database error:', error);
			return json({ error: 'Failed to create session' }, { status: 500 });
		}

		return json(session, { status: 201 });
	} catch (error) {
		console.error('Error creating session:', error);
		
		if (error instanceof z.ZodError) {
			return json({ error: 'Invalid input', details: error.issues }, { status: 400 });
		}
		
		return json({ error: 'Failed to create session' }, { status: 500 });
	}
};

export const GET: RequestHandler = async ({ url, cookies }) => {
	try {
		const wall_id = url.searchParams.get('wall_id');
		if (!wall_id) {
			return json({ error: 'wall_id is required' }, { status: 400 });
		}
		
		const parsed = GetSessionsSchema.parse({ wall_id });
		const supabase = createSupabaseServerClient(cookies);
		
		// Get sessions for wall
		const { data: sessions, error } = await supabase
			.from('canvas_sessions')
			.select('*')
			.eq('wall_id', parsed.wall_id)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Database error:', error);
			return json({ error: 'Failed to fetch sessions' }, { status: 500 });
		}

		return json(sessions);
	} catch (error) {
		console.error('Error fetching sessions:', error);
		
		if (error instanceof z.ZodError) {
			return json({ error: 'Invalid input', details: error.issues }, { status: 400 });
		}
		
		return json({ error: 'Failed to fetch sessions' }, { status: 500 });
	}
};