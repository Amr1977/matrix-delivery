import React from 'react';
import { useRouteError, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/i18nContext';
import '../MatrixTheme.css';

const GlobalError = () => {
    const error = useRouteError();
    const navigate = useNavigate();
    const { t } = useI18n();

    console.error("GlobalError caught:", error);

    const errorMessage = error?.statusText || error?.message || t('system.unexpectedError');
    const errorStack = process.env.NODE_ENV === 'development' ? error?.stack : null;

    return (
        <div style={{
            minHeight: '100vh',
            background: '#000000',
            color: '#00FF00',
            fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            overflow: 'hidden',
            position: 'relative'
        }}>
            {/* Matrix Background Effect */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "url('https://upload.wikimedia.org/wikipedia/commons/c/c0/Digital_rain_animation_medium_letters_shine.gif')",
                opacity: 0.1,
                pointerEvents: 'none',
                backgroundSize: 'cover'
            }} />

            <div className="card" style={{
                maxWidth: '600px',
                width: '100%',
                zIndex: 10,
                border: '2px solid #D32F2F', // Red border for error
                boxShadow: '0 0 30px rgba(220, 38, 38, 0.4)',
                background: 'linear-gradient(135deg, #1a0505 0%, #2a0a0a 100%)' // Dark red tint
            }}>
                <div style={{
                    fontSize: '4rem',
                    marginBottom: '1rem',
                    animation: 'matrix-pulse 2s infinite'
                }}>
                    ⚠️
                </div>

                <h1 style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: '#EF4444', // Red 500
                    marginBottom: '1rem',
                    textShadow: '0 0 10px rgba(239, 68, 68, 0.6)'
                }}>
                    {t('system.systemFailure')}
                </h1>

                <p style={{
                    fontSize: '1.25rem',
                    color: '#FECACA', // Red 200
                    marginBottom: '2rem'
                }}>
                    {t('system.unexpectedError')}
                </p>

                <div style={{
                    background: 'rgba(0, 0, 0, 0.5)',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #7F1D1D',
                    marginBottom: '2rem',
                    textAlign: 'left',
                    overflow: 'auto',
                    maxHeight: '200px',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    color: '#F87171'
                }}>
                    {errorMessage}
                    {errorStack && (
                        <div style={{ marginTop: '1rem', whiteSpace: 'pre-wrap', opacity: 0.8 }}>
                            {errorStack}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button
                        onClick={() => window.location.reload()}
                        className="btn"
                        style={{
                            background: '#DC2626',
                            color: 'white',
                            borderColor: '#B91C1C'
                        }}
                    >
                        {t('system.rebootSystem')}
                    </button>

                    <button
                        onClick={() => window.location.href = '/'}
                        className="btn"
                        style={{
                            background: 'transparent',
                            color: '#34D399',
                            borderColor: '#34D399'
                        }}
                    >
                        {t('system.returnToSource')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GlobalError;
