import React from 'react';
import logger from './logger';

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
    // Log the error to our logging system
    logger.logError(error, errorInfo, errorInfo?.componentStack || 'No component stack available');

    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{
          padding: '2rem',
          margin: '2rem',
          border: '1px solid #EF4444',
          borderRadius: '0.5rem',
          backgroundColor: '#FEF2F2',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#DC2626', marginBottom: '1rem' }}>
            🚨 Something went wrong
          </h2>
          <p style={{ color: '#7F1D1D', marginBottom: '1rem' }}>
            We're sorry, but something unexpected happened. Our team has been notified.
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
              fontWeight: '600'
            }}
          >
            Reload Page
          </button>
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: '1rem', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', color: '#7F1D1D' }}>
                Error Details (Development Only)
              </summary>
              <pre style={{
                background: '#FEE2E2',
                padding: '1rem',
                borderRadius: '0.375rem',
                marginTop: '0.5rem',
                fontSize: '0.75rem',
                overflow: 'auto',
                color: '#991B1B'
              }}>
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo?.componentStack || 'No component stack available'}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
