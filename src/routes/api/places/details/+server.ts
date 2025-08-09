import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PUBLIC_GOOGLE_MAPS_API_KEY } from '$env/static/public';

export const GET: RequestHandler = async ({ url }) => {
  const placeId = url.searchParams.get('place_id');
  
  if (!placeId) {
    return json({ error: 'place_id is required' }, { status: 400 });
  }

  try {
    const googleUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    googleUrl.searchParams.set('place_id', placeId);
    googleUrl.searchParams.set('key', PUBLIC_GOOGLE_MAPS_API_KEY);
    googleUrl.searchParams.set('fields', 'place_id,formatted_address,name,geometry/location,types');
    googleUrl.searchParams.set('language', 'en');
    
    const response = await fetch(googleUrl.toString());
    
    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      console.error('Google Places Details API error:', data);
      if (data.status === 'NOT_FOUND') {
        return json({ error: 'Place not found' }, { status: 404 });
      }
      throw new Error(`Google API status: ${data.status}`);
    }
    
    const place = data.result;
    
    if (!place) {
      return json({ error: 'Place not found' }, { status: 404 });
    }

    return json({
      place_id: place.place_id,
      name: place.name,
      formatted_address: place.formatted_address,
      location: place.geometry?.location ? {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng
      } : null,
      types: place.types
    });
  } catch (error) {
    console.error('Places details API error:', error);
    return json({ error: 'Failed to fetch place details' }, { status: 500 });
  }
};