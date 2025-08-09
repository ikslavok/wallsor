export interface ExcalidrawElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  strokeColor?: string;
  backgroundColor?: string;
  [key: string]: any;
}

export interface Point {
  x: number;
  y: number;
}

export interface Session {
  session_id: string;
  wall_id: string;
  creator_anon_id: string;
  session_bounds?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  session_centroid?: Point;
  element_count: number;
  is_active?: boolean; // Optional with default
  created_at: string;
  updated_at: string;
  finalized_at?: string;
}

export interface SessionManagerConfig {
  INACTIVITY_TIMEOUT: number; // milliseconds
  PROXIMITY_THRESHOLD: number; // pixels
  DEBOUNCE_DELAY: number; // milliseconds for onChange debouncing
}

export class SessionManager {
  private currentSession: Session | null = null;
  private lastActivity: number = Date.now();
  private sessionCentroid: Point = { x: 0, y: 0 };
  private wallId: string;
  private anonId: string;
  private config: SessionManagerConfig;
  private inactivityTimer: NodeJS.Timeout | null = null;

  // Default configuration
  public static readonly DEFAULT_CONFIG: SessionManagerConfig = {
    INACTIVITY_TIMEOUT: 60000, // 1 minute
    PROXIMITY_THRESHOLD: 400,  // 400 pixels
    DEBOUNCE_DELAY: 500       // 500ms debounce
  };

  constructor(
    wallId: string, 
    anonId: string, 
    config: SessionManagerConfig = SessionManager.DEFAULT_CONFIG
  ) {
    this.wallId = wallId;
    this.anonId = anonId;
    this.config = config;
  }

  /**
   * Calculate Euclidean distance between two points
   */
  public calculateDistance(point1: Point, point2: Point): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get the center point of an element
   */
  public getElementCenter(element: ExcalidrawElement): Point {
    return {
      x: element.x + (element.width || 0) / 2,
      y: element.y + (element.height || 0) / 2
    };
  }

  /**
   * Check if a new session should be created based on proximity and inactivity
   */
  public shouldCreateNewSession(element: ExcalidrawElement): boolean {
    const now = Date.now();
    
    // Always create first session
    if (!this.currentSession) {
      return true;
    }

    // Check inactivity timeout
    const timeSinceLastActivity = now - this.lastActivity;
    if (timeSinceLastActivity > this.config.INACTIVITY_TIMEOUT) {
      console.log('Creating new session due to inactivity timeout:', timeSinceLastActivity + 'ms');
      return true;
    }

    // Check proximity threshold
    const elementCenter = this.getElementCenter(element);
    const distance = this.calculateDistance(elementCenter, this.sessionCentroid);
    
    if (distance > this.config.PROXIMITY_THRESHOLD) {
      console.log('Creating new session due to proximity threshold:', distance + 'px');
      return true;
    }

    return false;
  }

  /**
   * Update session bounds and centroid based on new element
   */
  public updateSessionBounds(session: Session, element: ExcalidrawElement): void {
    const elementRight = element.x + (element.width || 0);
    const elementBottom = element.y + (element.height || 0);

    if (!session.session_bounds) {
      // Initialize bounds with first element
      session.session_bounds = {
        minX: element.x,
        minY: element.y,
        maxX: elementRight,
        maxY: elementBottom
      };
    } else {
      // Expand bounds to include new element
      session.session_bounds.minX = Math.min(session.session_bounds.minX, element.x);
      session.session_bounds.minY = Math.min(session.session_bounds.minY, element.y);
      session.session_bounds.maxX = Math.max(session.session_bounds.maxX, elementRight);
      session.session_bounds.maxY = Math.max(session.session_bounds.maxY, elementBottom);
    }

    // Update centroid
    const bounds = session.session_bounds;
    session.session_centroid = {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2
    };
    
    this.sessionCentroid = session.session_centroid;
  }

  /**
   * Create a new session via API
   */
  public async createSession(): Promise<Session> {
    const response = await fetch('/api/canvas/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wall_id: this.wallId
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create session');
    }

    const session = await response.json();
    this.currentSession = session;
    this.lastActivity = Date.now();
    
    // Reset inactivity timer
    this.resetInactivityTimer();
    
    return session;
  }

  /**
   * Finalize current session (mark as inactive)
   */
  public async finalizeSession(sessionId: string): Promise<void> {
    const response = await fetch(`/api/canvas/sessions/${sessionId}/finalize`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      console.warn('Failed to finalize session:', sessionId);
    }

    // Clear current session if it matches
    if (this.currentSession?.session_id === sessionId) {
      this.currentSession = null;
      this.clearInactivityTimer();
    }
  }

  /**
   * Get current active session or create new one if needed
   */
  public async getCurrentSession(triggerElement?: ExcalidrawElement): Promise<Session> {
    // Check if we need a new session
    if (!this.currentSession || (triggerElement && this.shouldCreateNewSession(triggerElement))) {
      // Finalize previous session if exists (only if it has elements)
      if (this.currentSession) {
        await this.finalizeSession(this.currentSession.session_id);
      }
      
      // Create new session only when we have an actual element to add
      if (!triggerElement) {
        throw new Error('Cannot create session without a trigger element');
      }
      
      return await this.createSession();
    }

    // Update activity timestamp
    this.lastActivity = Date.now();
    this.resetInactivityTimer();
    
    return this.currentSession;
  }

  /**
   * Process new element and assign to appropriate session
   */
  public async processElement(element: ExcalidrawElement): Promise<{ session: Session; shouldCreateNode: boolean }> {
    const session = await this.getCurrentSession(element);
    
    // Update session bounds with new element
    this.updateSessionBounds(session, element);
    
    return {
      session,
      shouldCreateNode: true
    };
  }

  /**
   * Reset the inactivity timer
   */
  private resetInactivityTimer(): void {
    this.clearInactivityTimer();
    
    this.inactivityTimer = setTimeout(async () => {
      if (this.currentSession) {
        console.log('Auto-finalizing session due to inactivity');
        await this.finalizeSession(this.currentSession.session_id);
      }
    }, this.config.INACTIVITY_TIMEOUT);
  }

  /**
   * Clear the inactivity timer
   */
  private clearInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  /**
   * Convert Excalidraw element type to canvas node type
   */
  public static mapElementToNodeType(elementType: string): string {
    const typeMapping: Record<string, string> = {
      'rectangle': 'draw',
      'ellipse': 'draw',
      'diamond': 'draw',
      'arrow': 'draw',
      'line': 'draw',
      'freedraw': 'draw',
      'text': 'text',
      'image': 'file',
      'frame': 'group'
    };
    
    return typeMapping[elementType] || 'draw';
  }

  /**
   * Create canvas node from Excalidraw element
   */
  public static createNodeFromElement(
    element: ExcalidrawElement, 
    sessionId: string, 
    wallId: string
  ): any {
    return {
      session_id: sessionId,
      wall_id: wallId,
      node_type: SessionManager.mapElementToNodeType(element.type),
      x: element.x,
      y: element.y,
      width: element.width || 0,
      height: element.height || 0,
      content: {
        strokeColor: element.strokeColor,
        backgroundColor: element.backgroundColor,
        elementType: element.type,
        excalidrawId: element.id,
        ...element
      },
      color: element.strokeColor || element.backgroundColor
    };
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.clearInactivityTimer();
    this.currentSession = null;
  }
}