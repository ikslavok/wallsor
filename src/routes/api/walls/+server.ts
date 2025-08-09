import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createWall, getWalls, generateSlug } from '$lib/server/database';
import { z } from 'zod';

const CreateWallSchema = z.object({
  name: z.string().min(1).max(255),
  location_name: z.string().optional(),
  location_place_id: z.string().optional(),
  location_lat: z.number().optional(),
  location_lng: z.number().optional()
});

export const GET: RequestHandler = async ({ cookies }) => {
  try {
    const walls = await getWalls(cookies);
    return json(walls);
  } catch (error) {
    console.error('Error fetching walls:', error);
    return json({ error: 'Failed to fetch walls' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
  try {
    const body = await request.json();
    const parsed = CreateWallSchema.parse(body);
    
    const slug = generateSlug(parsed.name);
    const anonId = locals.anonId;
    
    const wall = await createWall(cookies, {
      name: parsed.name,
      slug,
      location_name: parsed.location_name,
      location_place_id: parsed.location_place_id,
      location_lat: parsed.location_lat,
      location_lng: parsed.location_lng,
      creator_anon_id: anonId
    });
    
    return json(wall, { status: 201 });
  } catch (error) {
    console.error('Error creating wall:', error);
    
    if (error instanceof z.ZodError) {
      return json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    
    return json({ error: 'Failed to create wall' }, { status: 500 });
  }
};