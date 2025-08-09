# Wallsor Database Schema

This directory contains the database schema and configuration for the Wallsor application using Supabase.

## Schema Overview

The database consists of two main tables:

### `walls` Table
Stores information about walls (graffiti/art locations):
- `wall_id` (UUID, PK) - Unique identifier for each wall
- `name` (VARCHAR 255, NOT NULL) - Display name of the wall
- `slug` (VARCHAR 255, UNIQUE, NOT NULL) - URL-friendly identifier
- `location_name` (TEXT) - Human-readable location description
- `location_lat` (DECIMAL 10,8) - Latitude coordinate
- `location_lng` (DECIMAL 11,8) - Longitude coordinate  
- `location_place_id` (VARCHAR 255) - Google Maps Place ID
- `creator_anon_id` (UUID, NOT NULL) - Anonymous user ID who created this wall entry
- `created_at` (TIMESTAMP WITH TIME ZONE) - Creation timestamp
- `updated_at` (TIMESTAMP WITH TIME ZONE) - Last update timestamp
- `last_opened_at` (TIMESTAMP WITH TIME ZONE) - When wall was last viewed

### `wall_views` Table
Tracks when users view walls:
- `view_id` (UUID, PK) - Unique identifier for each view
- `wall_id` (UUID, FK) - References walls.wall_id (CASCADE DELETE)
- `viewer_anon_id` (UUID, NOT NULL) - Anonymous user ID who viewed the wall
- `viewed_at` (TIMESTAMP WITH TIME ZONE) - When the view occurred

## Indexes

Performance indexes are created for:
- `idx_walls_slug` - Fast lookups by slug
- `idx_walls_creator` - Fast lookups by creator
- `idx_wall_views_wall` - Fast lookups of views by wall
- `idx_wall_views_viewer` - Fast lookups of views by viewer

## Files

- `migrations/001_initial_schema.sql` - Initial database schema creation
- `seed.sql` - Sample data for development/testing
- `config.toml` - Supabase local development configuration

## Setup Instructions

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Initialize Supabase in your project (if not already done):
   ```bash
   supabase init
   ```

3. Start local Supabase development environment:
   ```bash
   supabase start
   ```

4. Apply the database migrations:
   ```bash
   supabase db reset
   ```

5. (Optional) Load seed data:
   ```bash
   supabase db reset --seed
   ```

6. Set up your environment variables in `.env`:
   ```
   PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   PUBLIC_SUPABASE_ANON_KEY=your_anon_key_from_supabase_start_output
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

## Production Deployment

To deploy this schema to production:

1. Link your local project to your Supabase project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

2. Push the migrations:
   ```bash
   supabase db push
   ```

## Database Client

The TypeScript client configuration is available in `src/lib/supabase.ts` with proper type definitions for the schema.