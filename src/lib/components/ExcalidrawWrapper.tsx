import React, { useCallback, useRef, useEffect } from 'react';
import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { SessionManager, type ExcalidrawElement } from '../utils/session-manager';

interface ExcalidrawWrapperProps {
  wallId: string;
  wallName?: string;
  wallSlug?: string;
  wallCreatedAt?: string;
  wallLastOpenedAt?: string;
  initialData?: {
    elements: any[];
    appState: any;
  };
  onChange?: (elements: readonly any[], appState: any, files: any) => void;
}

const ExcalidrawWrapper: React.FC<ExcalidrawWrapperProps> = ({ 
  wallId,
  wallName,
  wallSlug,
  wallCreatedAt,
  wallLastOpenedAt,
  initialData,
  onChange 
}) => {
  const sessionManagerRef = useRef<SessionManager | null>(null);
  const processedElementsRef = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastElementStatesRef = useRef<Map<string, any>>(new Map());
  const elementToNodeIdRef = useRef<Map<string, string>>(new Map());

  // Initialize session manager
  useEffect(() => {
    // Get anonymous user ID from cookie or localStorage
    const getAnonId = () => {
      // This will be available from the server-side context
      // For now, we'll use a placeholder and rely on server-side processing
      return 'anonymous-user-id'; // This should come from the server context
    };

    sessionManagerRef.current = new SessionManager(
      wallId,
      getAnonId(),
      SessionManager.DEFAULT_CONFIG
    );

    return () => {
      if (sessionManagerRef.current) {
        sessionManagerRef.current.destroy();
      }
    };
  }, [wallId]);

  const processElementChanges = useCallback(async (elements: readonly ExcalidrawElement[]) => {
    if (!sessionManagerRef.current) return;

    // Find new elements that haven't been processed yet
    const newElements = elements.filter(element => 
      element.id && !processedElementsRef.current.has(element.id)
    );

    // Find existing elements that may have been updated
    const existingElements = elements.filter(element => 
      element.id && processedElementsRef.current.has(element.id)
    );

    // Process each new element
    for (const element of newElements) {
      try {
        // Process element through session manager
        const { session, shouldCreateNode } = await sessionManagerRef.current.processElement(element);
        
        if (shouldCreateNode) {
          // Create node data from Excalidraw element
          const nodeData = SessionManager.createNodeFromElement(element, session.session_id, wallId);
          
          // Send to API
          const response = await fetch('/api/canvas/nodes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nodeData)
          });

          if (response.ok) {
            const nodeResult = await response.json();
            // Mark element as processed and store the node mapping
            processedElementsRef.current.add(element.id);
            elementToNodeIdRef.current.set(element.id, nodeResult.node_id);
            console.log('Element processed successfully:', element.id, '-> node:', nodeResult.node_id);
          } else {
            console.error('Failed to create node for element:', element.id);
          }
        }
      } catch (error) {
        console.error('Error processing element:', element.id, error);
      }
    }

    // Update existing elements that may have changed
    for (const element of existingElements) {
      try {
        // Check if element has been modified (compare with last known state)
        const lastElement = lastElementStatesRef.current.get(element.id);
        const hasChanged = !lastElement || 
          lastElement.x !== element.x || 
          lastElement.y !== element.y || 
          lastElement.width !== element.width || 
          lastElement.height !== element.height ||
          JSON.stringify(lastElement.strokeColor) !== JSON.stringify(element.strokeColor) ||
          JSON.stringify(lastElement.backgroundColor) !== JSON.stringify(element.backgroundColor);

        if (hasChanged) {
          // Get the database node ID for this element
          const nodeId = elementToNodeIdRef.current.get(element.id);
          if (!nodeId) {
            console.warn('No node ID found for element:', element.id);
            continue;
          }

          // Process element to get session info
          const { session } = await sessionManagerRef.current.processElement(element);
          
          // Create updated node data
          const nodeData = SessionManager.createNodeFromElement(element, session.session_id, wallId);
          nodeData.node_id = nodeId; // Use the database node ID
          
          // Send update to API
          const response = await fetch('/api/canvas/nodes', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nodeData)
          });

          if (response.ok) {
            // Update stored element state
            lastElementStatesRef.current.set(element.id, {
              x: element.x,
              y: element.y,
              width: element.width,
              height: element.height,
              strokeColor: element.strokeColor,
              backgroundColor: element.backgroundColor
            });
            console.log('Element updated successfully:', element.id, '-> node:', nodeId);
          } else {
            console.error('Failed to update node for element:', element.id);
          }
        } else if (!lastElement) {
          // Store initial state for new elements we're tracking
          lastElementStatesRef.current.set(element.id, {
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
            strokeColor: element.strokeColor,
            backgroundColor: element.backgroundColor
          });
        }
      } catch (error) {
        console.error('Error updating element:', element.id, error);
      }
    }
  }, [wallId]);

  // Debounced onChange handler
  const debouncedOnChange = useCallback((elements: readonly any[], appState: any, files: any) => {
    // Call original onChange if provided
    if (onChange) {
      onChange(elements, appState, files);
    }

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      processElementChanges(elements as ExcalidrawElement[]);
    }, SessionManager.DEFAULT_CONFIG.DEBOUNCE_DELAY);
  }, [onChange, processElementChanges]);

  const handleMainMenuClick = () => {
    window.location.href = '/';
  };

  // Handle image upload and paste
  const handlePaste = useCallback(async (_data: any, event: ClipboardEvent | null) => {
    if (!event) return false;
    
    const files = Array.from(event.clipboardData?.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      // Let Excalidraw handle the image paste natively
      return true;
    }
    return false;
  }, []);

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh',
      position: 'fixed',
      top: 0,
      left: 0
    }}>
      <style>{`
        .zoom-actions { display: none !important; }
        .help-icon { display: none !important; }
        .excalidraw-button[title="Library"] { display: none !important; }
        .library-button { display: none !important; }
        .library-menu-items-container { display: none !important; }
        .welcome-screen-decor { display: none !important; }
        .excalidraw-button[title="Toggle shortcuts"] { display: none !important; }
        .excalidraw-button[title="Help"] { display: none !important; }
        .Stats { display: none !important; }
        .github-corner { display: none !important; }
        /* Hide Excalidraw links section in menu */
        .dropdown-menu-group:last-child { display: none !important; }
        /* Alternative: target by content */
        a[href*="github.com/excalidraw"] { display: none !important; }
        a[href*="twitter.com"] { display: none !important; }
        a[href*="discord"] { display: none !important; }
        /* Hide parent containers of these links */
        .dropdown-menu-item:has(a[href*="github.com/excalidraw"]) { display: none !important; }
        .dropdown-menu-item:has(a[href*="twitter.com"]) { display: none !important; }
        .dropdown-menu-item:has(a[href*="discord"]) { display: none !important; }
        /* Hide the separator before social links */
        .dropdown-menu-group:last-child hr { display: none !important; }
        /* Hide by aria-label */
        [aria-label*="GitHub"] { display: none !important; }
        [aria-label*="Follow"] { display: none !important; }
        [aria-label*="Discord"] { display: none !important; }
        [aria-label="X"] { display: none !important; }
        /* Hide export image option */
        [aria-label*="Export"] { display: none !important; }
        .dropdown-menu-item:has([aria-label*="Export"]) { display: none !important; }
        /* Hide X/Twitter link */
        a[href*="x.com/excalidraw"] { display: none !important; }
        .dropdown-menu-item:has(a[href*="x.com"]) { display: none !important; }
        /* Hide Excalidraw links title and separators */
        .dropdown-menu-group-title:has-text("Excalidraw links") { display: none !important; }
        .dropdown-menu-group-title { display: none !important; }
        p.dropdown-menu-group-title { display: none !important; }
        /* Hide the hr elements around the Excalidraw links section */
        .dropdown-menu-group:has(.dropdown-menu-group-title) { display: none !important; }
        .dropdown-menu hr:last-of-type { display: none !important; }
        .dropdown-menu hr:nth-last-of-type(2) { display: none !important; }
      `}</style>
      {React.createElement(Excalidraw as any, {
        initialData,
        onChange: debouncedOnChange,
        onPaste: handlePaste,
        name: wallName || 'Wall',
        UIOptions: {
          canvasActions: {
            saveToActiveFile: false,
            loadScene: false,
            export: false,
            clearCanvas: false,
            changeViewBackgroundColor: false,
            toggleTheme: false
          },
          tools: {
            image: true
          }
        },
        viewModeEnabled: false,
        zenModeEnabled: false,
        gridModeEnabled: false,
        children: [
          React.createElement(MainMenu as any, {
            key: 'mainmenu'
          }, [
            React.createElement((MainMenu as any).Item, {
              key: 'home',
              onSelect: handleMainMenuClick
            }, 'Return to Home'),
            React.createElement((MainMenu as any).DefaultItems.SearchMenu, { key: 'search' }),
            React.createElement((MainMenu as any).DefaultItems.Help, { key: 'help' })
          ])
        ]
      })}
    </div>
  );
};

export default ExcalidrawWrapper;