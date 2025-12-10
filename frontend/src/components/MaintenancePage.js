import React from 'react';

/**
 * MaintenanceRedirect Component
 * Redirects to the existing maintenance page when backend is down
 */
const MaintenanceRedirect = ({ onRetry, isChecking, lastCheck }) => {
    // Use iframe to show maintenance page while keeping React app mounted
    // This allows automatic recovery when backend comes back

    React.useEffect(() => {
        // Add keyboard shortcut to retry (Ctrl+R or Cmd+R)
        const handleKeyPress = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                onRetry();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [onRetry]);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            background: 'black'
        }}>
            <iframe
                src="/maintenance/index.html"
                title="Maintenance"
                style={{
                    width: '100%',
                    height: '100%',
                    border: 'none'
                }}
            />

            {/* Hidden retry info for debugging */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                background: 'rgba(0, 255, 149, 0.1)',
                color: '#00ff95',
                padding: '10px 15px',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'monospace',
                border: '1px solid #00ff95'
            }}>
                {isChecking ? (
                    <span>⟳ Checking server...</span>
                ) : (
                    <span>↻ Auto-retry in progress</span>
                )}
                {lastCheck && (
                    <div style={{ marginTop: '5px', opacity: 0.7 }}>
                        Last: {new Date(lastCheck).toLocaleTimeString()}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MaintenanceRedirect;
