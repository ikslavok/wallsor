import { createSupabaseServerClient } from './supabase';
import type { Cookies } from '@sveltejs/kit';

export type Wall = {
  wall_id: string;
  name: string;
  slug: string;
  location_name?: string;
  location_lat?: number;
  location_lng?: number;
  location_place_id?: string;
  creator_anon_id: string;
  created_at: string;
  updated_at: string;
  last_opened_at?: string;
};

export type WallView = {
  view_id: string;
  wall_id: string;
  viewer_anon_id: string;
  viewed_at: string;
};

export async function createWall(
  cookies: Cookies,
  wall: {
    name: string;
    slug: string;
    location_name?: string;
    location_place_id?: string;
    location_lat?: number;
    location_lng?: number;
    creator_anon_id: string;
  }
): Promise<Wall> {
  const supabase = createSupabaseServerClient(cookies);
  
  const { data, error } = await supabase
    .from('walls')
    .insert([wall])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create wall: ${error.message}`);
  }

  return data;
}

export async function getWalls(cookies: Cookies): Promise<Wall[]> {
  const supabase = createSupabaseServerClient(cookies);
  
  const { data, error } = await supabase
    .from('walls')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch walls: ${error.message}`);
  }

  return data || [];
}

export async function getWallBySlug(cookies: Cookies, slug: string): Promise<Wall | null> {
  const supabase = createSupabaseServerClient(cookies);
  
  const { data, error } = await supabase
    .from('walls')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch wall: ${error.message}`);
  }

  return data;
}

export async function updateWallLastOpened(cookies: Cookies, wallId: string): Promise<void> {
  const supabase = createSupabaseServerClient(cookies);
  
  const { error } = await supabase
    .from('walls')
    .update({ last_opened_at: new Date().toISOString() })
    .eq('wall_id', wallId);

  if (error) {
    console.error('Failed to update last opened:', error.message);
  }
}

export async function trackWallView(
  cookies: Cookies, 
  wallId: string, 
  viewerAnonId: string
): Promise<void> {
  const supabase = createSupabaseServerClient(cookies);
  
  const { error } = await supabase
    .from('wall_views')
    .insert([{
      wall_id: wallId,
      viewer_anon_id: viewerAnonId
    }]);

  if (error) {
    console.error('Failed to track wall view:', error.message);
  }
}

export { generateSlug } from '$lib/utils/slug';