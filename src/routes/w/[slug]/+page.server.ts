import type { PageServerLoad } from './$types';
import { getWallBySlug, updateWallLastOpened, trackWallView } from '$lib/server/database';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, cookies, locals }) => {
  const wall = await getWallBySlug(cookies, params.slug);
  
  if (!wall) {
    throw error(404, 'Wall not found');
  }

  // Update last opened timestamp and track view
  await Promise.all([
    updateWallLastOpened(cookies, wall.wall_id),
    trackWallView(cookies, wall.wall_id, locals.anonId)
  ]);

  return {
    wall
  };
};