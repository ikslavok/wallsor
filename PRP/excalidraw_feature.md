# Project Requirements Plan (PRP)
# Wallsor - Collaborative Drawing Whiteboard Enhancement

## 1. Executive Summary

**Project Name:** Wallsor Wall Page Enhancement  
**Type:** Feature Enhancement  
**Purpose:** Transform individual wall pages into collaborative drawing whiteboards using Excalidraw  
**Target Users:** Anonymous users with real-time collaboration capabilities  

## 2. Core Features

### 2.1 Drawing Canvas Integration
- **Full-page Excalidraw whiteboard** (no margins, covers entire viewport)
- **Floating info icon** in top-right corner (existing implementation)
- **Drawing tools**: Simple pen/brush for drawing
- **Image support**: Add and manipulate images on canvas
- **Clean UI**: Minimal interface focused on drawing experience

### 2.2 Node-based Data Structure
- **Session-based drawing**: Continuous drawing (under 1 minute pause) = single session
- **Individual nodes**: Each drawing session or image = separate node
- **JSON Canvas format**: Follow JSON Canvas standard for data structure
- **Metadata**: Each node includes timestamp, creator ID, wall ID
- **Ownership model**: Only creator can delete their nodes

### 2.3 Real-time Collaboration
- **Live updates**: Multiple users can draw simultaneously
- **Conflict resolution**: Handle concurrent editing gracefully  
- **Anonymous collaboration**: Users identified by anonymous IDs
- **Responsive sync**: Sub-second latency for drawing updates

## 3. Technical Architecture

### 3.1 Technology Stack

**Frontend Enhancement**
- Excalidraw React component integration
- SvelteKit wrapper for Excalidraw
- Real-time WebSocket connections
- Canvas state management

**Backend Services**
- Supabase real-time subscriptions
- Node storage and retrieval APIs
- WebSocket handling for collaboration
- Rate limiting for drawing operations

**Data Format**
- JSON Canvas specification compliance
- Node-based storage structure
- Efficient delta updates for real-time sync

### 3.2 Database Schema Enhancement

```sql
-- Nodes table for drawing elements
CREATE TABLE wall_nodes (
  node_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wall_id UUID REFERENCES walls(wall_id) ON DELETE CASCADE,
  creator_anon_id UUID NOT NULL,
  node_type VARCHAR(50) NOT NULL, -- 'drawing', 'image', 'text'
  node_data JSONB NOT NULL, -- JSON Canvas compliant data
  session_id UUID, -- Groups related drawing strokes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  x DECIMAL(10,2), -- Canvas position
  y DECIMAL(10,2), -- Canvas position
  width DECIMAL(10,2),
  height DECIMAL(10,2)
);

-- Drawing sessions table
CREATE TABLE drawing_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wall_id UUID REFERENCES walls(wall_id) ON DELETE CASCADE,
  creator_anon_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Indexes for performance
CREATE INDEX idx_wall_nodes_wall ON wall_nodes(wall_id);
CREATE INDEX idx_wall_nodes_creator ON wall_nodes(creator_anon_id);
CREATE INDEX idx_wall_nodes_session ON wall_nodes(session_id);
CREATE INDEX idx_drawing_sessions_wall ON drawing_sessions(wall_id);
CREATE INDEX idx_drawing_sessions_active ON drawing_sessions(is_active);
```

### 3.3 JSON Canvas Data Structure

```typescript
// JSON Canvas Node Structure
interface CanvasNode {
  id: string;
  type: 'drawing' | 'image' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  data: {
    // For drawing nodes
    strokes?: ExcalidrawElement[];
    // For image nodes  
    src?: string;
    alt?: string;
    // For text nodes
    text?: string;
    fontSize?: number;
  };
  createdAt: string;
  creatorId: string;
}

// Session Management
interface DrawingSession {
  sessionId: string;
  wallId: string;
  creatorId: string;
  startedAt: string;
  isActive: boolean;
  nodes: CanvasNode[];
}
```

## 4. User Stories & Acceptance Criteria

### 4.1 As a user, I want to draw on a wall canvas

**Acceptance Criteria:**
- Wall page shows full-screen Excalidraw canvas
- Simple pen/brush tool is available and functional
- Drawing strokes are smooth and responsive
- Info icon remains accessible in top-right corner
- Canvas state persists across page reloads

### 4.2 As a user, I want to add images to the canvas

**Acceptance Criteria:**
- Can upload and place images on canvas
- Images can be moved, resized, and positioned
- Images are stored as separate nodes
- Supported formats: PNG, JPG, GIF, SVG

### 4.3 As a user, I want my drawing sessions to be saved automatically

**Acceptance Criteria:**
- Continuous drawing (< 1 min pause) saves as single session
- Each session creates one node in database
- Drawing pauses > 1 minute start new session
- Sessions are tied to anonymous user ID and wall ID

### 4.4 As a user, I want to collaborate in real-time

**Acceptance Criteria:**
- See other users' cursors and drawing in real-time
- Changes appear within 500ms for all users
- No conflicts when multiple users draw simultaneously
- Anonymous users can collaborate seamlessly

### 4.5 As a user, I want to manage my content

**Acceptance Criteria:**
- Can delete only my own drawing nodes
- Cannot delete other users' content
- Delete operations sync in real-time
- Confirmation dialog for delete actions

## 5. API Endpoints

### 5.1 Node Management

```typescript
// Get all nodes for a wall
GET /api/walls/[wall_id]/nodes
Response: { nodes: CanvasNode[] }

// Create new node
POST /api/walls/[wall_id]/nodes
Body: { type, x, y, width, height, data }
Response: { node: CanvasNode }

// Update existing node
PUT /api/walls/[wall_id]/nodes/[node_id]
Body: { x?, y?, width?, height?, data? }
Response: { node: CanvasNode }

// Delete node (owner only)
DELETE /api/walls/[wall_id]/nodes/[node_id]
Response: { success: boolean }
```

### 5.2 Session Management

```typescript
// Start drawing session
POST /api/walls/[wall_id]/sessions
Response: { session: DrawingSession }

// End drawing session
PUT /api/walls/[wall_id]/sessions/[session_id]/end
Response: { session: DrawingSession }

// Get active sessions
GET /api/walls/[wall_id]/sessions/active
Response: { sessions: DrawingSession[] }
```

### 5.3 Real-time WebSocket Events

```typescript
// Drawing events
'drawing:start' - User starts drawing
'drawing:update' - Drawing stroke update
'drawing:end' - Drawing session complete

// Node events
'node:created' - New node added
'node:updated' - Node modified
'node:deleted' - Node removed

// User events
'user:joined' - User joined wall
'user:left' - User left wall
'cursor:move' - User cursor position
```

## 6. Implementation Phases

### Phase 1: Excalidraw Integration (Week 1)
- [ ] Install and configure Excalidraw for Svelte
- [ ] Replace empty wall page with full-screen canvas
- [ ] Maintain floating info icon functionality
- [ ] Basic pen drawing capabilities
- [ ] Local state management

### Phase 2: Data Persistence (Week 2)
- [ ] Create database schema for nodes and sessions
- [ ] Implement session management logic
- [ ] Build node CRUD API endpoints
- [ ] JSON Canvas format compliance
- [ ] Auto-save drawing sessions

### Phase 3: Image Support (Week 3)
- [ ] Image upload functionality
- [ ] Image node creation and management
- [ ] Image positioning and resizing
- [ ] File storage integration (Supabase Storage)
- [ ] Image optimization and validation

### Phase 4: Real-time Collaboration (Week 4)
- [ ] Supabase real-time subscriptions
- [ ] WebSocket event handling
- [ ] Cursor tracking and display
- [ ] Conflict resolution strategies
- [ ] Performance optimization

### Phase 5: Polish & Security (Week 5)
- [ ] Rate limiting implementation
- [ ] Error handling and recovery
- [ ] User permission validation
- [ ] Performance monitoring
- [ ] Mobile responsiveness

## 7. Security & Performance

### 7.1 Security Measures
- **Rate limiting**: Max 100 drawing operations per minute per user
- **Content validation**: Sanitize all node data before storage
- **Access control**: Users can only delete their own nodes
- **File upload limits**: Max 5MB per image, specific formats only
- **Anonymous user tracking**: Prevent abuse through session monitoring

### 7.2 Performance Requirements
- **Real-time latency**: < 500ms for drawing updates
- **Canvas responsiveness**: 60fps drawing performance
- **Database queries**: < 100ms for node operations
- **Memory usage**: Efficient canvas state management
- **Bandwidth optimization**: Delta updates, not full canvas sync

## 8. Success Metrics

- **User Engagement**: Average session time on wall pages
- **Collaboration Usage**: Percentage of walls with multiple contributors
- **Performance**: 95th percentile drawing latency < 500ms
- **Reliability**: 99.9% uptime for real-time features
- **Data Integrity**: Zero data loss during collaboration

## 9. Technical Considerations

### 9.1 Excalidraw Integration
- Use `@excalidraw/excalidraw` npm package
- Wrap in Svelte component with proper lifecycle management
- Custom toolbar to limit tools (pen and image only)
- Handle Excalidraw's state management within Svelte reactivity

### 9.2 JSON Canvas Compliance
- Follow https://jsoncanvas.org/ specification
- Ensure data portability and future extensibility
- Validate JSON structure before database storage
- Support for future node types (text, shapes, etc.)

### 9.3 Real-time Architecture
- Use Supabase's real-time features for WebSocket connections
- Implement operational transformation for conflict resolution
- Efficient delta updates to minimize bandwidth
- Graceful degradation when real-time connection fails

## 10. Future Enhancements (Out of Scope)

- Advanced drawing tools (shapes, text, arrows)
- Layer management and organization
- Export functionality (PDF, PNG, SVG)
- Voice/video chat integration
- Version history and undo/redo
- User authentication and persistent accounts
- Wall templates and backgrounds
- Advanced collaboration features (comments, reactions)

## 11. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Excalidraw performance on large canvases | High | Implement canvas virtualization, node pagination |
| Real-time sync conflicts | Medium | Operational transformation, last-write-wins for simple operations |
| Database load from frequent updates | Medium | Rate limiting, batch updates, efficient indexing |
| Anonymous user abuse | Low | Rate limiting, temporary IP blocking |

## 12. Dependencies & Integration Points

### 12.1 External Libraries
- `@excalidraw/excalidraw` - Core drawing functionality
- Supabase real-time client - WebSocket connections
- JSON Canvas schema validation library

### 12.2 Integration with Existing System
- Extends current wall page functionality
- Maintains existing authentication (anonymous users)
- Uses established database patterns and API structure
- Compatible with existing UI components (info dialog)

## 13. Acceptance Testing Checklist

- [ ] Wall page displays full-screen Excalidraw canvas
- [ ] Info icon remains functional in top-right corner
- [ ] Pen drawing works smoothly with proper stroke rendering
- [ ] Image upload and placement functionality works
- [ ] Drawing sessions save automatically after 1-minute pause
- [ ] Multiple users can draw simultaneously without conflicts
- [ ] Real-time updates appear within 500ms
- [ ] Users can delete only their own nodes
- [ ] Canvas state persists across page reloads
- [ ] Rate limiting prevents abuse
- [ ] Mobile devices show responsive canvas interface
- [ ] JSON Canvas data format compliance verified

---

**Document Version:** 1.0  
**Last Updated:** 2025-08-09  
**Status:** Ready for Development  
**Estimated Timeline:** 5 weeks  
**Dependencies:** Excalidraw library, Supabase real-time features