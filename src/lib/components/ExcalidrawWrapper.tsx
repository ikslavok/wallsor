import React from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';

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

  const handleMainMenuClick = () => {
    if (confirm('Are you sure you want to go back to the main page?')) {
      window.location.href = '/';
    }
  };

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
        onChange,
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
            image: false
          }
        },
        viewModeEnabled: false,
        zenModeEnabled: false,
        gridModeEnabled: false,
        renderMenu: () => (
          <div style={{ padding: '8px 0' }}>
            <button
              onClick={handleMainMenuClick}
              style={{
                width: '100%',
                padding: '8px 16px',
                fontSize: '14px',
                cursor: 'pointer',
                background: 'transparent',
                border: 'none',
                textAlign: 'left',
                color: '#1c1e21',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => {
                (e.target as HTMLButtonElement).style.background = '#f0f0f0';
              }}
              onMouseOut={(e) => {
                (e.target as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              <span style={{ fontSize: '16px' }}>🏠</span>
              Return to Home
            </button>
          </div>
        ),
      })}
    </div>
  );
};

export default ExcalidrawWrapper;