import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/server/supabase';
import { z } from 'zod';

const ExcalidrawDataSchema = z.object({
	wall_id: z.string().uuid(),
	elements: z.array(z.any()),
	appState: z.object({
		viewBackgroundColor: z.string().optional(),
		currentItemStrokeColor: z.string().optional(),
		currentItemBackgroundColor: z.string().optional(),
		currentItemFillStyle: z.string().optional(),
		currentItemStrokeWidth: z.number().optional(),
		currentItemFontFamily: z.number().optional(),
		currentItemFontSize: z.number().optional(),
		zoom: z.object({
			value: z.number()
		}).optional(),
		scrollX: z.number().optional(),
		scrollY: z.number().optional()
	}).optional()
});

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	try {
		const body = await request.json();
		const parsed = ExcalidrawDataSchema.parse(body);
		const anonId = locals.anonId;
		
		const supabase = createSupabaseServerClient(cookies);
		
		// Check if wall exists
		const { data: wall } = await supabase
			.from('walls')
			.select('wall_id')
			.eq('wall_id', parsed.wall_id)
			.single();
		
		if (!wall) {
			return json({ error: 'Wall not found' }, { status: 404 });
		}
		
		// Upsert the excalidraw data
		const { data, error } = await supabase
			.from('wall_excalidraw_data')
			.upsert({
				wall_id: parsed.wall_id,
				elements: parsed.elements,
				app_state: parsed.appState,
				last_edited_by: anonId,
				updated_at: new Date().toISOString()
			}, {
				onConflict: 'wall_id'
			})
			.select()
			.single();

		if (error) {
			console.error('Database error:', error);
			return json({ error: 'Failed to save canvas data' }, { status: 500 });
		}

		return json({ success: true, data });
	} catch (error) {
		console.error('Error saving excalidraw data:', error);
		
		if (error instanceof z.ZodError) {
			return json({ error: 'Invalid input', details: error.issues }, { status: 400 });
		}
		
		return json({ error: 'Failed to save canvas data' }, { status: 500 });
	}
};

export const GET: RequestHandler = async ({ url, cookies }) => {
	try {
		const wall_id = url.searchParams.get('wall_id');
		
		if (!wall_id) {
			return json({ error: 'wall_id is required' }, { status: 400 });
		}
		
		const supabase = createSupabaseServerClient(cookies);
		
		// Get the latest excalidraw data for this wall
		const { data, error } = await supabase
			.from('wall_excalidraw_data')
			.select('*')
			.eq('wall_id', wall_id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				// No data found, return empty
				return json({ elements: [], appState: {} });
			}
			console.error('Database error:', error);
			return json({ error: 'Failed to fetch canvas data' }, { status: 500 });
		}

		return json({
			elements: data.elements || [],
			appState: data.app_state || {}
		});
	} catch (error) {
		console.error('Error fetching excalidraw data:', error);
		return json({ error: 'Failed to fetch canvas data' }, { status: 500 });
	}
};