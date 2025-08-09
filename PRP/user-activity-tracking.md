# Project Requirements Plan: User Activity Tracking & Profile Management

## Executive Summary

This PRP outlines the implementation of a comprehensive user activity tracking system for the Wallsor collaborative whiteboard application. The feature will track individual user drawing actions as discrete nodes, organize them into proximity-based sessions, and provide a user profile interface for managing personal activity and walls.

## Feature Overview

### Core Requirements
- **Activity Tracking**: Monitor all drawing actions (shapes, images, text) as individual nodes
- **Session Management**: Group related drawing activities using proximity and time-based logic  
- **User Profile**: Homepage interface showing user's drawings/activity and walls with management capabilities
- **Data Privacy**: Allow users to delete their content and reset their anonymous identity

### Success Metrics
- Real-time activity tracking with < 100ms latency
- Session auto-creation within 2-second intervals
- Profile interface loads user data in < 500ms
- Zero data loss during session transitions

## Current System Analysis

### Existing Infrastructure ✅
- **Database Schema**: `canvas_sessions` and `canvas_nodes` tables already exist
- **Anonymous Auth**: UUID-based user identification via cookies (`/src/lib/server/auth.ts`)
- **Excalidraw Integration**: React wrapper with onChange event handling (`/src/lib/components/ExcalidrawWrapper.tsx`)
- **API Endpoints**: CRUD operations for sessions and nodes (`/src/routes/api/canvas/*`)

### Key Technical Insights
- **Excalidraw Events**: onChange fires on every element change, requires debouncing
- **Element Structure**: Each Excalidraw element has id, type, x/y coordinates, dimensions
- **Current Storage**: Two parallel systems exist (bulk excalidraw_data + individual canvas_nodes)
- **Security Gap**: RLS policies currently allow unrestricted access (needs fixing)

## Technical Implementation Blueprint

### Phase 1: Enhanced Activity Tracking (Week 1-2)

#### 1.1 Session Management Logic
```typescript
interface SessionManager {
  currentSession: Session | null;
  lastActivity: timestamp;
  sessionCentroid: { x: number, y: number };
  
  // Constants
  INACTIVITY_TIMEOUT: 60000; // 1 minute
  PROXIMITY_THRESHOLD: 400;  // pixels
  
  // Methods
  shouldCreateNewSession(element: ExcalidrawElement): boolean;
  calculateDistance(point1: Point, point2: Point): number;
  updateSessionBounds(session: Session, element: ExcalidrawElement): void;
  finalizeSession(sessionId: string): Promise<void>;
}
```

#### 1.2 Element Processing Pipeline
1. **onChange Handler Enhancement**: Debounce to 500ms, extract element changes
2. **Element Classification**: Map Excalidraw types to canvas_nodes schema (text, draw, group, etc.)
3. **Session Association**: Calculate proximity to determine session membership
4. **Node Creation**: Transform Excalidraw elements to canvas_nodes records
5. **Background Processing**: Monitor for inactive sessions, auto-finalize

#### 1.3 Database Integration
```sql
-- Enhanced canvas_nodes with session metadata
ALTER TABLE canvas_nodes ADD COLUMN session_bounds JSONB;
ALTER TABLE canvas_nodes ADD COLUMN element_excalidraw_id TEXT;

-- Improved RLS policies (replace existing permissive policies)
CREATE POLICY "Users can manage own sessions" ON canvas_sessions 
  FOR ALL USING (creator_anon_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY "Users can manage own nodes" ON canvas_nodes 
  FOR ALL USING (creator_anon_id = current_setting('app.current_user_id')::UUID);
```

### Phase 2: User Profile Interface (Week 3)

#### 2.1 Homepage UI Components
- **Profile Icon**: Top-right corner with user avatar/initials
- **Profile Modal**: Slide-out or modal with tabbed interface
- **Activity Tab**: Chronological list of drawing sessions with thumbnails
- **Walls Tab**: User-created walls with last edit timestamps
- **Management Actions**: Delete individual items, reset anonymous ID

#### 2.2 Component Architecture
```svelte
<!-- src/lib/components/user-profile.svelte -->
<script lang="ts">
  import { getUserSessions, getUserWalls, deleteUserData, resetAnonId } from '$lib/api/profile';
  
  interface UserSession {
    session_id: string;
    wall_name: string;
    node_count: number;
    created_at: string;
    session_bounds: { minX: number, minY: number, maxX: number, maxY: number };
  }
</script>
```

#### 2.3 API Endpoints
- `GET /api/profile/sessions` - Fetch user's drawing sessions
- `GET /api/profile/walls` - Fetch user's created walls  
- `DELETE /api/profile/sessions/:id` - Delete specific session
- `DELETE /api/profile/walls/:id` - Delete specific wall
- `POST /api/profile/reset-id` - Generate new anonymous ID

### Phase 3: Real-time Enhancements (Week 4)

#### 3.1 WebSocket Integration (Optional)
- Real-time session updates for collaborative scenarios
- Live activity indicators for multi-user walls
- Session conflict resolution for simultaneous users

#### 3.2 Performance Optimizations
- **Client-side Caching**: Store recent sessions in localStorage
- **Lazy Loading**: Paginated activity lists for users with extensive history
- **Thumbnail Generation**: Create visual previews of drawing sessions

## Implementation Validation Gates

### Gate 1: Core Session Logic ✅
- [ ] Inactivity timeout creates new sessions after 60 seconds
- [ ] Proximity threshold (400px) triggers session boundaries
- [ ] Elements correctly mapped from Excalidraw to canvas_nodes
- [ ] Session centroid calculation accurate within 5px tolerance
- [ ] Background session finalization runs without errors

### Gate 2: User Interface ✅
- [ ] Profile icon visible on homepage top-right corner
- [ ] Modal opens with Activity/Walls tabs functional
- [ ] Activity list shows sessions with correct timestamps
- [ ] Walls list displays user-created walls only
- [ ] Delete operations remove data and update UI instantly
- [ ] Reset ID generates new UUID and clears associations

### Gate 3: Data Security & Performance ✅
- [ ] RLS policies restrict access to user's own data
- [ ] Profile data loads within 500ms for typical users
- [ ] No data corruption during session transitions
- [ ] Anonymous ID reset completely disconnects previous activity
- [ ] Element tracking maintains <100ms response time

## Testing Strategy

### Unit Testing
- **Session Logic**: Test proximity calculations, timeout handling
- **Element Processing**: Verify Excalidraw-to-node transformations
- **API Endpoints**: Test CRUD operations, authentication, edge cases

### Integration Testing
- **End-to-End Flows**: Create sessions, view profile, delete data, reset ID
- **Performance Testing**: Stress test with 100+ elements per session
- **Security Testing**: Verify RLS policies prevent unauthorized access

### User Acceptance Testing
- **Usability**: Profile interface intuitive for non-technical users
- **Data Privacy**: Users can successfully manage their content
- **Performance**: System remains responsive during active drawing

## Risk Assessment & Mitigation

### High Priority Risks
1. **Performance Degradation**: onChange events firing too frequently
   - *Mitigation*: Implement debouncing and batch processing
2. **Data Loss**: Session transitions causing element loss
   - *Mitigation*: Transactional saves, rollback mechanisms
3. **Privacy Concerns**: Anonymous ID collisions or tracking failures
   - *Mitigation*: UUID validation, secure cookie management

### Medium Priority Risks
1. **Storage Growth**: Individual node tracking increases database size
   - *Mitigation*: Implement data retention policies, archival system
2. **Complexity**: Session management adds significant code complexity
   - *Mitigation*: Comprehensive testing, clear documentation

## Success Criteria & Metrics

### Functional Success
- ✅ Users can view their complete drawing activity history
- ✅ Session auto-creation works consistently without user intervention
- ✅ Profile management (delete/reset) functions correctly
- ✅ Data remains private to individual anonymous users

### Performance Success  
- ✅ Real-time tracking maintains <100ms response time
- ✅ Profile interface loads within 500ms
- ✅ System supports 50+ concurrent active sessions
- ✅ Database queries optimized with proper indexing

### User Experience Success
- ✅ Feature is discoverable and intuitive
- ✅ Users understand session grouping logic
- ✅ Data management gives users control over their content
- ✅ Anonymous ID system maintains privacy while enabling features

## Timeline & Resource Allocation

### Phase 1 (Weeks 1-2): Core Implementation
- **Backend**: Session logic, enhanced APIs, database updates
- **Frontend**: Excalidraw integration improvements
- **Testing**: Unit tests for session management

### Phase 2 (Week 3): User Interface  
- **Frontend**: Profile components, modal interface, data management
- **API**: Profile endpoints, user data aggregation
- **Testing**: Integration testing, UI validation

### Phase 3 (Week 4): Polish & Performance
- **Optimization**: Caching, lazy loading, performance tuning
- **Security**: RLS policy implementation, security testing
- **Documentation**: User guides, API documentation

### Phase 4 (Week 5): Launch Preparation
- **UAT**: User acceptance testing, feedback integration
- **Monitoring**: Error tracking, performance metrics
- **Deployment**: Production rollout, monitoring setup

## Conclusion

This comprehensive user activity tracking system transforms Wallsor from a simple collaborative whiteboard into a personal creative workspace where users can track, organize, and manage their drawing activity. The proximity-based session logic provides intuitive grouping of related drawing actions, while the profile interface gives users complete control over their creative output and privacy.

The implementation leverages existing infrastructure while adding sophisticated activity tracking that maintains excellent performance and user privacy. Success will be measured through both technical metrics (response time, data accuracy) and user satisfaction (feature adoption, usability feedback).