-- Migration to support shorter user IDs instead of UUIDs
-- Change creator_anon_id and viewer_anon_id fields from UUID to TEXT

-- Drop existing indexes first
DROP INDEX IF EXISTS idx_walls_creator;
DROP INDEX IF EXISTS idx_wall_views_viewer;
DROP INDEX IF EXISTS idx_canvas_sessions_creator;
DROP INDEX IF EXISTS idx_canvas_nodes_creator;

-- Change walls table
ALTER TABLE walls ALTER COLUMN creator_anon_id TYPE TEXT;

-- Change wall_views table  
ALTER TABLE wall_views ALTER COLUMN viewer_anon_id TYPE TEXT;

-- Change canvas_sessions table
ALTER TABLE canvas_sessions ALTER COLUMN creator_anon_id TYPE TEXT;

-- Change canvas_nodes table
ALTER TABLE canvas_nodes ALTER COLUMN creator_anon_id TYPE TEXT;

-- Recreate indexes
CREATE INDEX idx_walls_creator ON walls(creator_anon_id);
CREATE INDEX idx_wall_views_viewer ON wall_views(viewer_anon_id);
CREATE INDEX idx_canvas_sessions_creator ON canvas_sessions(creator_anon_id);
CREATE INDEX idx_canvas_nodes_creator ON canvas_nodes(creator_anon_id);

-- Update RLS policies to work with text IDs instead of UUIDs
-- Note: The existing permissive policies should still work, but we'll update them for clarity

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all access to canvas_sessions" ON canvas_sessions;
DROP POLICY IF EXISTS "Allow all access to canvas_nodes" ON canvas_nodes;
DROP POLICY IF EXISTS "Allow all access to canvas_edges" ON canvas_edges;

-- Recreate policies (still permissive for now but ready for proper user-scoped policies later)
CREATE POLICY "Allow all access to canvas_sessions" ON canvas_sessions FOR ALL USING (true);
CREATE POLICY "Allow all access to canvas_nodes" ON canvas_nodes FOR ALL USING (true);
CREATE POLICY "Allow all access to canvas_edges" ON canvas_edges FOR ALL USING (true);