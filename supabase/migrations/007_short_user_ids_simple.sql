-- Simple migration to convert UUID columns to TEXT for 12-character user IDs
-- This migration handles the conversion more safely

BEGIN;

-- First, let's check what data exists and convert any existing UUIDs to short format
-- Note: This will essentially reset user associations since we can't map UUIDs to short IDs

-- Drop foreign key constraints temporarily
ALTER TABLE wall_views DROP CONSTRAINT IF EXISTS wall_views_wall_id_fkey;
ALTER TABLE canvas_sessions DROP CONSTRAINT IF EXISTS canvas_sessions_wall_id_fkey;
ALTER TABLE canvas_nodes DROP CONSTRAINT IF EXISTS canvas_nodes_wall_id_fkey;
ALTER TABLE canvas_nodes DROP CONSTRAINT IF EXISTS canvas_nodes_session_id_fkey;
ALTER TABLE canvas_edges DROP CONSTRAINT IF EXISTS canvas_edges_wall_id_fkey;
ALTER TABLE canvas_edges DROP CONSTRAINT IF EXISTS canvas_edges_session_id_fkey;

-- Drop existing indexes on UUID columns
DROP INDEX IF EXISTS idx_walls_creator;
DROP INDEX IF EXISTS idx_wall_views_viewer;
DROP INDEX IF EXISTS idx_canvas_sessions_creator;
DROP INDEX IF EXISTS idx_canvas_nodes_creator;

-- Convert walls table
ALTER TABLE walls ALTER COLUMN creator_anon_id TYPE TEXT;

-- Convert wall_views table  
ALTER TABLE wall_views ALTER COLUMN viewer_anon_id TYPE TEXT;

-- Convert canvas_sessions table
ALTER TABLE canvas_sessions ALTER COLUMN creator_anon_id TYPE TEXT;

-- Convert canvas_nodes table
ALTER TABLE canvas_nodes ALTER COLUMN creator_anon_id TYPE TEXT;

-- Recreate indexes for TEXT columns
CREATE INDEX idx_walls_creator ON walls(creator_anon_id);
CREATE INDEX idx_wall_views_viewer ON wall_views(viewer_anon_id);
CREATE INDEX idx_canvas_sessions_creator ON canvas_sessions(creator_anon_id);
CREATE INDEX idx_canvas_nodes_creator ON canvas_nodes(creator_anon_id);

-- Recreate foreign key constraints
ALTER TABLE wall_views ADD CONSTRAINT wall_views_wall_id_fkey 
    FOREIGN KEY (wall_id) REFERENCES walls(wall_id) ON DELETE CASCADE;
    
ALTER TABLE canvas_sessions ADD CONSTRAINT canvas_sessions_wall_id_fkey 
    FOREIGN KEY (wall_id) REFERENCES walls(wall_id) ON DELETE CASCADE;
    
ALTER TABLE canvas_nodes ADD CONSTRAINT canvas_nodes_wall_id_fkey 
    FOREIGN KEY (wall_id) REFERENCES walls(wall_id) ON DELETE CASCADE;
    
ALTER TABLE canvas_nodes ADD CONSTRAINT canvas_nodes_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES canvas_sessions(session_id) ON DELETE CASCADE;
    
ALTER TABLE canvas_edges ADD CONSTRAINT canvas_edges_wall_id_fkey 
    FOREIGN KEY (wall_id) REFERENCES walls(wall_id) ON DELETE CASCADE;
    
ALTER TABLE canvas_edges ADD CONSTRAINT canvas_edges_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES canvas_sessions(session_id) ON DELETE CASCADE;

-- Clear existing data since UUIDs won't work with new short format
-- This is a fresh start for user ID associations
TRUNCATE canvas_edges CASCADE;
TRUNCATE canvas_nodes CASCADE;
TRUNCATE canvas_sessions CASCADE;
TRUNCATE wall_views CASCADE;
-- Keep walls but they will need to be re-associated with new short user IDs

COMMIT;