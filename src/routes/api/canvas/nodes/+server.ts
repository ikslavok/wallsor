import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/server/supabase';
import { z } from 'zod';

const CreateNodeSchema = z.object({
	session_id: z.string().uuid(),
	wall_id: z.string().uuid(),
	node_type: z.enum(['text', 'file', 'link', 'group', 'draw']),
	x: z.number(),
	y: z.number(),
	width: z.number().optional(),
	height: z.number().optional(),
	content: z.any(), // JSON content
	color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
});

const GetNodesSchema = z.object({
	wall_id: z.string().uuid(),
	session_id: z.string().uuid().optional()
});

const UpdateNodeSchema = z.object({
	node_id: z.string().uuid(),
	x: z.number().optional(),
	y: z.number().optional(),
	width: z.number().optional(),
	height: z.number().optional(),
	content: z.any().optional(),
	color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
});

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	try {
		const body = await request.json();
		const parsed = CreateNodeSchema.parse(body);
		const anonId = locals.anonId;
		
		const supabase = createSupabaseServerClient(cookies);
		
		// Set the current user context for RLS
		await supabase.rpc('set_config', {
			setting_name: 'app.current_user_id',
			setting_value: anonId
		});
		
		// Create new canvas node
		const { data: node, error } = await supabase
			.from('canvas_nodes')
			.insert({
				session_id: parsed.session_id,
				wall_id: parsed.wall_id,
				creator_anon_id: anonId,
				node_type: parsed.node_type,
				x: parsed.x,
				y: parsed.y,
				width: parsed.width,
				height: parsed.height,
				content: parsed.content,
				color: parsed.color
			})
			.select()
			.single();

		if (error) {
			console.error('Database error:', error);
			return json({ error: 'Failed to create node' }, { status: 500 });
		}

		return json(node, { status: 201 });
	} catch (error) {
		console.error('Error creating node:', error);
		
		if (error instanceof z.ZodError) {
			return json({ error: 'Invalid input', details: error.issues }, { status: 400 });
		}
		
		return json({ error: 'Failed to create node' }, { status: 500 });
	}
};

export const GET: RequestHandler = async ({ url, cookies, locals }) => {
	try {
		const wall_id = url.searchParams.get('wall_id');
		const session_id = url.searchParams.get('session_id');
		
		if (!wall_id) {
			return json({ error: 'wall_id is required' }, { status: 400 });
		}
		
		const parsed = GetNodesSchema.parse({ wall_id, session_id });
		const supabase = createSupabaseServerClient(cookies);
		const anonId = locals.anonId;
		
		// Set the current user context for RLS
		await supabase.rpc('set_config', {
			setting_name: 'app.current_user_id',
			setting_value: anonId
		});
		
		let query = supabase
			.from('canvas_nodes')
			.select('*')
			.eq('wall_id', parsed.wall_id)
			.order('created_at', { ascending: true });
		
		// Filter by session if provided
		if (parsed.session_id) {
			query = query.eq('session_id', parsed.session_id);
		}

		const { data: nodes, error } = await query;

		if (error) {
			console.error('Database error:', error);
			return json({ error: 'Failed to fetch nodes' }, { status: 500 });
		}

		return json(nodes);
	} catch (error) {
		console.error('Error fetching nodes:', error);
		
		if (error instanceof z.ZodError) {
			return json({ error: 'Invalid input', details: error.issues }, { status: 400 });
		}
		
		return json({ error: 'Failed to fetch nodes' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request, cookies, locals }) => {
	try {
		const body = await request.json();
		const parsed = UpdateNodeSchema.parse(body);
		const anonId = locals.anonId;
		
		const supabase = createSupabaseServerClient(cookies);
		
		// Set the current user context for RLS
		await supabase.rpc('set_config', {
			setting_name: 'app.current_user_id',
			setting_value: anonId
		});
		
		// Update node (only if created by the same user)
		const { data: node, error } = await supabase
			.from('canvas_nodes')
			.update({
				...(parsed.x !== undefined && { x: parsed.x }),
				...(parsed.y !== undefined && { y: parsed.y }),
				...(parsed.width !== undefined && { width: parsed.width }),
				...(parsed.height !== undefined && { height: parsed.height }),
				...(parsed.content !== undefined && { content: parsed.content }),
				...(parsed.color !== undefined && { color: parsed.color })
			})
			.eq('node_id', parsed.node_id)
			.eq('creator_anon_id', anonId) // Only allow updating own nodes
			.select()
			.single();

		if (error) {
			console.error('Database error:', error);
			return json({ error: 'Failed to update node' }, { status: 500 });
		}

		if (!node) {
			return json({ error: 'Node not found or not authorized' }, { status: 404 });
		}

		return json(node);
	} catch (error) {
		console.error('Error updating node:', error);
		
		if (error instanceof z.ZodError) {
			return json({ error: 'Invalid input', details: error.issues }, { status: 400 });
		}
		
		return json({ error: 'Failed to update node' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ url, cookies, locals }) => {
	try {
		const node_id = url.searchParams.get('node_id');
		
		if (!node_id) {
			return json({ error: 'node_id is required' }, { status: 400 });
		}
		
		const anonId = locals.anonId;
		const supabase = createSupabaseServerClient(cookies);
		
		// Set the current user context for RLS
		await supabase.rpc('set_config', {
			setting_name: 'app.current_user_id',
			setting_value: anonId
		});
		
		// Delete node (only if created by the same user)
		const { error } = await supabase
			.from('canvas_nodes')
			.delete()
			.eq('node_id', node_id)
			.eq('creator_anon_id', anonId); // Only allow deleting own nodes

		if (error) {
			console.error('Database error:', error);
			return json({ error: 'Failed to delete node' }, { status: 500 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting node:', error);
		return json({ error: 'Failed to delete node' }, { status: 500 });
	}
};