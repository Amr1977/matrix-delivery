import React from 'react';
import translations from './i18n/locales';

// Get translation helper for class component (can't use hooks)
const getTranslation = (key) => {
  const locale = localStorage.getItem('locale') || 'en';
  const keys = key.split('.');
  let value = translations[locale];
  for (const k of keys) {
    value = value?.[k];
  }
  return value || key;
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error('React Error Boundary caught an error:', error, errorInfo);

    // Check for error #31 - objects as children
    if (error && error.message && error.message.includes && error.message.includes('31')) {
      console.error('Error #31 detected: Objects as children. This usually happens when:',
        '\n- A React element object is rendered as a child',
        '\n- An object with $typeof, type, key, ref, props is passed as a child',
        '\n- The props.children contains an invalid React element'
      );
    }

    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      const t = getTranslation;

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
            background: 'linear-gradient(135deg, #1a0505 0%, #2a0a0a 100%)', // Dark red tint
            padding: '2rem',
            borderRadius: '1rem'
          }}>
            <div style={{
              fontSize: '4rem',
              marginBottom: '1rem',
              // Simple pulse animation fallback if CSS not loaded
              animation: 'matrix-pulse 2s infinite'
            }}>
              ⚠️
            </div>

            <h2 style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#EF4444',
              marginBottom: '1rem',
              textShadow: '0 0 10px rgba(239, 68, 68, 0.6)'
            }}>
              {t('system.criticalError')}
            </h2>

            <p style={{
              fontSize: '1.25rem',
              color: '#FECACA',
              marginBottom: '2rem'
            }}>
              {t('system.unrecoverableException')}
            </p>

            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#DC2626',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
                boxShadow: '0 0 10px rgba(220, 38, 38, 0.4)',
                fontFamily: 'inherit'
              }}
            >
              {t('system.rebootSystem')}
            </button>

            {process.env.NODE_ENV === 'development' && (
              <details style={{ marginTop: '2rem', textAlign: 'left', width: '100%' }}>
                <summary style={{ cursor: 'pointer', color: '#F87171', marginBottom: '0.5rem' }}>
                  {t('system.debugTrace')}
                </summary>
                <div style={{
                  background: 'rgba(0, 0, 0, 0.8)',
                  padding: '1rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  overflow: 'auto',
                  maxHeight: '300px',
                  color: '#FCA5A5',
                  border: '1px solid #7F1D1D'
                }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    {this.state.error && this.state.error.toString()}
                  </p>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {this.state.errorInfo?.componentStack || 'No component stack available'}
                  </pre>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
