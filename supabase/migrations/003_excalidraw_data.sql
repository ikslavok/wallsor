-- Create table for Excalidraw data storage
CREATE TABLE wall_excalidraw_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wall_id UUID NOT NULL UNIQUE,
    elements JSONB DEFAULT '[]'::jsonb,
    app_state JSONB DEFAULT '{}'::jsonb,
    last_edited_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (wall_id) REFERENCES walls(wall_id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX idx_wall_excalidraw_wall_id ON wall_excalidraw_data(wall_id);

-- Add trigger for updated_at
CREATE TRIGGER update_wall_excalidraw_data_updated_at BEFORE UPDATE
    ON wall_excalidraw_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE wall_excalidraw_data ENABLE ROW LEVEL SECURITY;

-- Allow all access (since we're using anonymous users)
CREATE POLICY "Allow all access to wall_excalidraw_data" ON wall_excalidraw_data FOR ALL USING (true);