-- Create the walls table
CREATE TABLE walls (
    wall_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    location_name TEXT,
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    location_place_id VARCHAR(255),
    creator_anon_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_opened_at TIMESTAMP WITH TIME ZONE
);

-- Create the wall_views table
CREATE TABLE wall_views (
    view_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wall_id UUID NOT NULL,
    viewer_anon_id UUID NOT NULL,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (wall_id) REFERENCES walls(wall_id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_walls_slug ON walls(slug);
CREATE INDEX idx_walls_creator ON walls(creator_anon_id);
CREATE INDEX idx_wall_views_wall ON wall_views(wall_id);
CREATE INDEX idx_wall_views_viewer ON wall_views(viewer_anon_id);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_walls_updated_at BEFORE UPDATE
    ON walls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();