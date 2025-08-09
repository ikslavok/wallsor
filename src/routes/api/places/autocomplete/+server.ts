import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PUBLIC_GOOGLE_MAPS_API_KEY } from '$env/static/public';

export const GET: RequestHandler = async ({ url }) => {
  const input = url.searchParams.get('input');
  
  if (!input || input.length < 2) {
    return json({ predictions: [] });
  }

  try {
    const googleUrl = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    googleUrl.searchParams.set('input', input);
    googleUrl.searchParams.set('key', PUBLIC_GOOGLE_MAPS_API_KEY);
    googleUrl.searchParams.set('language', 'en'); // You can change this to 'sr' for Serbian
    
    const response = await fetch(googleUrl.toString());
    
    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data);
      throw new Error(`Google API status: ${data.status}`);
    }
    
    const predictions = data.predictions?.map((prediction: any) => ({
      place_id: prediction.place_id,
      description: prediction.description,
      main_text: prediction.structured_formatting?.main_text,
      secondary_text: prediction.structured_formatting?.secondary_text,
      types: prediction.types
    })) || [];

    return json({ predictions });
  } catch (error) {
    console.error('Places API error:', error);
    return json({ error: 'Failed to fetch places', predictions: [] }, { status: 500 });
  }
};