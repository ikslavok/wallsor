-- Seed data for testing the Wallsor application
-- This file contains sample data for development and testing purposes

-- Sample walls data
INSERT INTO walls (wall_id, name, slug, location_name, location_lat, location_lng, location_place_id, creator_anon_id) VALUES
(gen_random_uuid(), 'Central Park Wall', 'central-park-wall', 'Central Park, New York, NY, USA', 40.78238200, -73.96551100, 'ChIJ4zGFAZpYwokRGUGph3Mf37k', gen_random_uuid()),
(gen_random_uuid(), 'Brooklyn Bridge Graffiti', 'brooklyn-bridge-graffiti', 'Brooklyn Bridge, New York, NY, USA', 40.70613800, -73.99658200, 'ChIJbcNq6LhbwokRNKgH2Mv2m6Q', gen_random_uuid()),
(gen_random_uuid(), 'Venice Beach Art Wall', 'venice-beach-art-wall', 'Venice Beach, Los Angeles, CA, USA', 33.98567200, -118.47277600, 'ChIJr8kDUF67woAR0wc6tDpbH-E', gen_random_uuid()),
(gen_random_uuid(), 'London Underground Tunnel', 'london-underground-tunnel', 'London, UK', 51.50731900, -0.12768300, 'ChIJdd4hrwug2EcRmSrV3Vo6llI', gen_random_uuid()),
(gen_random_uuid(), 'Berlin Wall Memorial', 'berlin-wall-memorial', 'Berlin Wall Memorial, Berlin, Germany', 52.53533100, 13.39031700, 'ChIJM7CkxIdRqEcRHzYMwcKCY6E', gen_random_uuid());

-- Sample wall views data
-- Note: In a real application, these would be generated when users view walls
INSERT INTO wall_views (wall_id, viewer_anon_id) 
SELECT w.wall_id, gen_random_uuid()
FROM walls w
CROSS JOIN generate_series(1, 3) -- Generate 3 views per wall for testing
LIMIT 15;