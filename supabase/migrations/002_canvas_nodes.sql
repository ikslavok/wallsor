-- Create canvas sessions table
CREATE TABLE canvas_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wall_id UUID NOT NULL,
    creator_anon_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (wall_id) REFERENCES walls(wall_id) ON DELETE CASCADE
);

-- Create canvas nodes table (following JSON Canvas specification)
CREATE TABLE canvas_nodes (
    node_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    wall_id UUID NOT NULL,
    creator_anon_id UUID NOT NULL,
    
    -- JSON Canvas properties
    node_type VARCHAR(20) NOT NULL CHECK (node_type IN ('text', 'file', 'link', 'group', 'draw')),
    
    -- Position and size
    x DECIMAL(12,4) NOT NULL,
    y DECIMAL(12,4) NOT NULL,
    width DECIMAL(12,4),
    height DECIMAL(12,4),
    
    -- Content (JSON format to support different node types)
    content JSONB NOT NULL,
    
    -- Styling
    color VARCHAR(7), -- hex color
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (session_id) REFERENCES canvas_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (wall_id) REFERENCES walls(wall_id) ON DELETE CASCADE
);

-- Create edges table for connections between nodes
CREATE TABLE canvas_edges (
    edge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    wall_id UUID NOT NULL,
    
    from_node_id UUID NOT NULL,
    to_node_id UUID NOT NULL,
    
    -- Edge styling
    color VARCHAR(7),
    style VARCHAR(20) DEFAULT 'solid' CHECK (style IN ('solid', 'dashed', 'dotted')),
    
    -- Connection points
    from_side VARCHAR(10) CHECK (from_side IN ('top', 'right', 'bottom', 'left')),
    to_side VARCHAR(10) CHECK (to_side IN ('top', 'right', 'bottom', 'left')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (session_id) REFERENCES canvas_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (wall_id) REFERENCES walls(wall_id) ON DELETE CASCADE,
    FOREIGN KEY (from_node_id) REFERENCES canvas_nodes(node_id) ON DELETE CASCADE,
    FOREIGN KEY (to_node_id) REFERENCES canvas_nodes(node_id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_canvas_sessions_wall ON canvas_sessions(wall_id);
CREATE INDEX idx_canvas_sessions_creator ON canvas_sessions(creator_anon_id);
CREATE INDEX idx_canvas_nodes_session ON canvas_nodes(session_id);
CREATE INDEX idx_canvas_nodes_wall ON canvas_nodes(wall_id);
CREATE INDEX idx_canvas_nodes_creator ON canvas_nodes(creator_anon_id);
CREATE INDEX idx_canvas_nodes_created ON canvas_nodes(created_at);
CREATE INDEX idx_canvas_edges_session ON canvas_edges(session_id);
CREATE INDEX idx_canvas_edges_wall ON canvas_edges(wall_id);

-- Add trigger for canvas_sessions updated_at
CREATE TRIGGER update_canvas_sessions_updated_at BEFORE UPDATE
    ON canvas_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add trigger for canvas_nodes updated_at  
CREATE TRIGGER update_canvas_nodes_updated_at BEFORE UPDATE
    ON canvas_nodes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) policies
ALTER TABLE canvas_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_edges ENABLE ROW LEVEL SECURITY;

-- Allow users to access sessions and nodes for walls they can access
-- (For now, allow all access since we're using anonymous users)
CREATE POLICY "Allow all access to canvas_sessions" ON canvas_sessions FOR ALL USING (true);
CREATE POLICY "Allow all access to canvas_nodes" ON canvas_nodes FOR ALL USING (true);
CREATE POLICY "Allow all access to canvas_edges" ON canvas_edges FOR ALL USING (true);