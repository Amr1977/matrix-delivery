import React, { useState } from 'react';

const FullscreenMapModal = ({
    children,
    isOpen,
    onClose,
    title = "Map View",
    osrmSuccess = false,
    routeDistance = null,
    routeFound = false,
    theme = 'dark'
}) => {
    if (!isOpen) return null;
    const isLightMode = theme === 'light';
    const borderColor = osrmSuccess || routeFound ? (isLightMode ? '#059669' : '#00FF00') : (isLightMode ? '#DC2626' : '#FF0000');
    const statusText = osrmSuccess || routeFound ? '✅ OSRM Route Found' : '⚠️ Straight Line Fallback';
    const statusColor = osrmSuccess || routeFound ? (isLightMode ? '#059669' : '#00FF00') : (isLightMode ? '#D97706' : '#FFA500');

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: isLightMode ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
        }}>
            <div style={{
                background: isLightMode ? '#F3F4F6' : '#000',
                border: `3px solid ${borderColor}`,
                borderRadius: '0.5rem',
                boxShadow: `0 0 20px ${borderColor}`,
                width: '100%',
                maxWidth: '90rem',
                height: '95vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                <button onClick={onClose} style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: isLightMode ? '#DC2626' : '#FF0000',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    padding: '0.5rem 1rem',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                }}>❌ Close</button>
                <h2 style={{
                    margin: 0,
                    padding: '1rem 0',
                    textAlign: 'center',
                    color: isLightMode ? '#1F2937' : '#30FF30',
                    fontSize: '1.5rem',
                    fontFamily: 'Consolas, Monaco, Courier New, monospace',
                    textShadow: isLightMode ? 'none' : '0 0 10px #30FF30'
                }}>{title}</h2>
                <div style={{
                    textAlign: 'center',
                    padding: '0.5rem',
                    background: isLightMode ? '#E5E7EB' : '#000',
                    borderTop: `2px solid ${borderColor}`,
                    color: statusColor,
                    fontSize: '0.875rem',
                    fontFamily: 'Consolas, Monaco, Courier New, monospace'
                }}>
                    <span>{statusText}</span>
                    {routeDistance && (
                        <span style={{ marginLeft: '1rem', color: isLightMode ? '#1F2937' : '#30FF30' }}>
                            📏 Distance: {routeDistance} km
                        </span>
                    )}
                </div>
                <div style={{
                    flex: 1,
                    minHeight: 0,
                    border: `5px solid ${borderColor}`,
                    borderRadius: '0.5rem',
                    overflow: 'hidden',
                    background: isLightMode ? '#E5E7EB' : '#000'
                }}>
                    {children}
                </div>
                <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    background: isLightMode ? '#F3F4F6' : 'rgba(0, 17, 0, 0.9)',
                    border: `2px solid ${borderColor}`,
                    borderRadius: '0.5rem',
                    textAlign: 'center',
                    color: isLightMode ? '#4B5563' : '#30FF30',
                    fontSize: '0.875rem',
                    fontFamily: 'Consolas, Monaco, Courier New, monospace'
                }}>
                    {osrmSuccess || routeFound ? (
                        <>🎯 Route calculated using OSRM (Open Source Routing Machine) - Following actual roads</>
                    ) : (
                        <>⚠️ OSRM unavailable - Showing straight-line estimate (Distance × 1.3 for urban routing)</>
                    )}
                </div>
            </div>
        </div>
    );
};

export const ClickableMap = ({
    children,
    title = "Map View",
    osrmSuccess = false,
    routeDistance = null,
    routeFound = false,
    compact = false,
    fullscreenChildren,
    theme = 'dark'
}) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const isLightMode = theme === 'light';
    const borderColor = osrmSuccess || routeFound ? (isLightMode ? '#059669' : '#00FF00') : (isLightMode ? '#DC2626' : '#FF0000');

    return (
        <>
            <div onClick={() => setIsFullscreen(true)} style={{
                cursor: 'pointer',
                position: 'relative',
                height: '100%',
                border: `3px solid ${borderColor}`,
                borderRadius: '0.5rem',
                overflow: 'hidden',
                boxShadow: `0 0 15px ${borderColor}`
            }} title="Click to view fullscreen">
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: isLightMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)',
                    color: isLightMode ? '#059669' : '#30FF30',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: 'bold',
                    zIndex: 1000,
                    border: `2px solid ${isLightMode ? '#059669' : '#00FF00'}`,
                    boxShadow: `0 0 10px ${isLightMode ? 'rgba(5,150,105,0.5)' : 'rgba(0,255,0,0.5)'}`,
                    pointerEvents: 'none'
                }}>🔍 Click for Fullscreen</div>
                {children}
            </div>
            <FullscreenMapModal
                isOpen={isFullscreen}
                onClose={() => setIsFullscreen(false)}
                title={title}
                osrmSuccess={osrmSuccess}
                routeDistance={routeDistance}
                routeFound={routeFound}
                theme={theme}
            >
                {fullscreenChildren || children}
            </FullscreenMapModal>
        </>
    );
};

export default FullscreenMapModal;
