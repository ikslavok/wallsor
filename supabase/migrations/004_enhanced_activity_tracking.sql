-- Enhanced activity tracking migration
-- Adds session bounds tracking and element references for user activity monitoring

-- Add session metadata columns to canvas_sessions
ALTER TABLE canvas_sessions ADD COLUMN session_bounds JSONB;
ALTER TABLE canvas_sessions ADD COLUMN element_count INTEGER DEFAULT 0;
ALTER TABLE canvas_sessions ADD COLUMN session_centroid JSONB; -- {x: number, y: number}
ALTER TABLE canvas_sessions ADD COLUMN is_active BOOLEAN DEFAULT true;
ALTER TABLE canvas_sessions ADD COLUMN finalized_at TIMESTAMP WITH TIME ZONE;

-- Add element tracking columns to canvas_nodes  
ALTER TABLE canvas_nodes ADD COLUMN element_excalidraw_id TEXT;
ALTER TABLE canvas_nodes ADD COLUMN element_type TEXT; -- Maps to Excalidraw element types
ALTER TABLE canvas_nodes ADD COLUMN element_bounds JSONB; -- Store element bounds for proximity calculations

-- Create indexes for performance
CREATE INDEX idx_canvas_sessions_active ON canvas_sessions(is_active, creator_anon_id);
CREATE INDEX idx_canvas_sessions_bounds ON canvas_sessions USING GIN(session_bounds);
CREATE INDEX idx_canvas_nodes_excalidraw_id ON canvas_nodes(element_excalidraw_id);
CREATE INDEX idx_canvas_nodes_element_type ON canvas_nodes(element_type);
CREATE INDEX idx_canvas_nodes_bounds ON canvas_nodes USING GIN(element_bounds);

-- Drop the existing overly permissive RLS policies
DROP POLICY IF EXISTS "Allow all access to canvas_sessions" ON canvas_sessions;
DROP POLICY IF EXISTS "Allow all access to canvas_nodes" ON canvas_nodes;
DROP POLICY IF EXISTS "Allow all access to canvas_edges" ON canvas_edges;

-- Create proper user-scoped RLS policies
-- Note: We'll set the anon_id via app.current_user_id in API calls

-- Sessions: Users can only access their own sessions
CREATE POLICY "Users can view own sessions" ON canvas_sessions 
  FOR SELECT USING (creator_anon_id = current_setting('app.current_user_id', true)::UUID);

CREATE POLICY "Users can insert own sessions" ON canvas_sessions 
  FOR INSERT WITH CHECK (creator_anon_id = current_setting('app.current_user_id', true)::UUID);

CREATE POLICY "Users can update own sessions" ON canvas_sessions 
  FOR UPDATE USING (creator_anon_id = current_setting('app.current_user_id', true)::UUID);

CREATE POLICY "Users can delete own sessions" ON canvas_sessions 
  FOR DELETE USING (creator_anon_id = current_setting('app.current_user_id', true)::UUID);

-- Nodes: Users can only access their own nodes
CREATE POLICY "Users can view own nodes" ON canvas_nodes 
  FOR SELECT USING (creator_anon_id = current_setting('app.current_user_id', true)::UUID);

CREATE POLICY "Users can insert own nodes" ON canvas_nodes 
  FOR INSERT WITH CHECK (creator_anon_id = current_setting('app.current_user_id', true)::UUID);

CREATE POLICY "Users can update own nodes" ON canvas_nodes 
  FOR UPDATE USING (creator_anon_id = current_setting('app.current_user_id', true)::UUID);

CREATE POLICY "Users can delete own nodes" ON canvas_nodes 
  FOR DELETE USING (creator_anon_id = current_setting('app.current_user_id', true)::UUID);

-- Edges: Users can only access edges involving their own nodes
CREATE POLICY "Users can view own edges" ON canvas_edges 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM canvas_nodes cn 
      WHERE (cn.node_id = canvas_edges.from_node_id OR cn.node_id = canvas_edges.to_node_id)
      AND cn.creator_anon_id = current_setting('app.current_user_id', true)::UUID
    )
  );

CREATE POLICY "Users can insert own edges" ON canvas_edges 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM canvas_nodes cn 
      WHERE cn.node_id = from_node_id 
      AND cn.creator_anon_id = current_setting('app.current_user_id', true)::UUID
    )
    AND EXISTS (
      SELECT 1 FROM canvas_nodes cn 
      WHERE cn.node_id = to_node_id 
      AND cn.creator_anon_id = current_setting('app.current_user_id', true)::UUID
    )
  );

CREATE POLICY "Users can update own edges" ON canvas_edges 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM canvas_nodes cn 
      WHERE (cn.node_id = canvas_edges.from_node_id OR cn.node_id = canvas_edges.to_node_id)
      AND cn.creator_anon_id = current_setting('app.current_user_id', true)::UUID
    )
  );

CREATE POLICY "Users can delete own edges" ON canvas_edges 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM canvas_nodes cn 
      WHERE (cn.node_id = canvas_edges.from_node_id OR cn.node_id = canvas_edges.to_node_id)
      AND cn.creator_anon_id = current_setting('app.current_user_id', true)::UUID
    )
  );

-- Create a function to update session bounds and centroid when nodes are added
CREATE OR REPLACE FUNCTION update_session_metadata()
RETURNS TRIGGER AS $$
DECLARE
    session_bounds_result JSONB;
    session_centroid_result JSONB;
    element_count_result INTEGER;
BEGIN
    -- Calculate session bounds, centroid, and element count
    SELECT 
        jsonb_build_object(
            'minX', MIN(x),
            'minY', MIN(y), 
            'maxX', MAX(x + COALESCE(width, 0)),
            'maxY', MAX(y + COALESCE(height, 0))
        ) as bounds,
        jsonb_build_object(
            'x', AVG(x + COALESCE(width, 0) / 2),
            'y', AVG(y + COALESCE(height, 0) / 2)
        ) as centroid,
        COUNT(*) as count
    INTO 
        session_bounds_result,
        session_centroid_result, 
        element_count_result
    FROM canvas_nodes 
    WHERE session_id = COALESCE(NEW.session_id, OLD.session_id);
    
    -- Update the session with calculated metadata
    UPDATE canvas_sessions 
    SET 
        session_bounds = session_bounds_result,
        session_centroid = session_centroid_result,
        element_count = element_count_result,
        updated_at = NOW()
    WHERE session_id = COALESCE(NEW.session_id, OLD.session_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update session metadata
CREATE TRIGGER update_session_metadata_on_node_insert
    AFTER INSERT ON canvas_nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_session_metadata();

CREATE TRIGGER update_session_metadata_on_node_update
    AFTER UPDATE ON canvas_nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_session_metadata();

CREATE TRIGGER update_session_metadata_on_node_delete
    AFTER DELETE ON canvas_nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_session_metadata();