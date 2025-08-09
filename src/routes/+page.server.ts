import type { PageServerLoad } from './$types';
import { getWalls } from '$lib/server/database';

export const load: PageServerLoad = async ({ cookies }) => {
  try {
    const walls = await getWalls(cookies);
    return {
      walls
    };
  } catch (error) {
    console.error('Error loading walls:', error);
    return {
      walls: []
    };
  }
};