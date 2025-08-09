-- Add missing element_bounds column if it doesn't exist
-- This handles cases where migration 004 wasn't fully applied

DO $$ 
BEGIN
    -- Check if element_bounds column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'canvas_nodes' 
        AND column_name = 'element_bounds'
    ) THEN
        ALTER TABLE canvas_nodes ADD COLUMN element_bounds JSONB;
        CREATE INDEX idx_canvas_nodes_bounds ON canvas_nodes USING GIN(element_bounds);
    END IF;

    -- Check if element_excalidraw_id column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'canvas_nodes' 
        AND column_name = 'element_excalidraw_id'
    ) THEN
        ALTER TABLE canvas_nodes ADD COLUMN element_excalidraw_id TEXT;
        CREATE INDEX idx_canvas_nodes_excalidraw_id ON canvas_nodes(element_excalidraw_id);
    END IF;

    -- Check if element_type column exists, if not add it  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'canvas_nodes' 
        AND column_name = 'element_type'
    ) THEN
        ALTER TABLE canvas_nodes ADD COLUMN element_type TEXT;
        CREATE INDEX idx_canvas_nodes_element_type ON canvas_nodes(element_type);
    END IF;

    -- Check if session_bounds column exists in canvas_sessions, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'canvas_sessions' 
        AND column_name = 'session_bounds'
    ) THEN
        ALTER TABLE canvas_sessions ADD COLUMN session_bounds JSONB;
        CREATE INDEX idx_canvas_sessions_bounds ON canvas_sessions USING GIN(session_bounds);
    END IF;

    -- Check if element_count column exists in canvas_sessions, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'canvas_sessions' 
        AND column_name = 'element_count'
    ) THEN
        ALTER TABLE canvas_sessions ADD COLUMN element_count INTEGER DEFAULT 0;
    END IF;

    -- Check if is_active column exists in canvas_sessions, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'canvas_sessions' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE canvas_sessions ADD COLUMN is_active BOOLEAN DEFAULT true;
        CREATE INDEX idx_canvas_sessions_active ON canvas_sessions(is_active, creator_anon_id);
    END IF;

    -- Check if finalized_at column exists in canvas_sessions, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'canvas_sessions' 
        AND column_name = 'finalized_at'
    ) THEN
        ALTER TABLE canvas_sessions ADD COLUMN finalized_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;