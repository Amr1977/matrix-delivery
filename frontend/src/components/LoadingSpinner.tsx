import React from 'react';

const LoadingSpinner: React.FC = () => {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: '#0d0208' // Matrix dark background
        }}>
            <div style={{
                textAlign: 'center',
                color: '#00ff41' // Matrix green
            }}>
                <div style={{
                    width: '60px',
                    height: '60px',
                    border: '4px solid rgba(0, 255, 65, 0.2)',
                    borderTop: '4px solid #00ff41',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 20px'
                }}></div>
                <p style={{ fontSize: '18px', fontWeight: '500', letterSpacing: '1px' }}>LOADING...</p>
                <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
            </div>
        </div>
    );
};

export default LoadingSpinner;
