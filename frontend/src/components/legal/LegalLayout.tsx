import React from 'react';

interface LegalLayoutProps {
    title: string;
    lastUpdated: string;
    children: React.ReactNode;
    onBack: () => void;
}

const LegalLayout: React.FC<LegalLayoutProps> = ({ title, lastUpdated, children, onBack }) => {
    return (
        <div style={{ minHeight: '100vh', background: '#090909', color: '#e5e7eb', padding: '1rem' }}>
            {/* Header */}
            <div style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '2rem' }}>
                <button
                    onClick={onBack}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--matrix-bright-green)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '1rem',
                        marginBottom: '1rem',
                        fontWeight: 'bold'
                    }}
                >
                    ← Back
                </button>
                <h1 style={{ fontSize: '2rem', color: 'var(--matrix-bright-green)', marginBottom: '0.5rem' }}>{title}</h1>
                <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Last Updated: {lastUpdated}</p>
            </div>

            {/* Content Content passed as children */}
            <div style={{
                maxWidth: '800px',
                margin: '0 auto',
                background: '#111827',
                padding: '2rem',
                borderRadius: '0.5rem',
                border: '1px solid #374151',
                lineHeight: '1.6'
            }}>
                {children}
            </div>

            {/* Footer */}
            <div style={{ maxWidth: '800px', margin: '2rem auto', textAlign: 'center', color: '#6b7280', fontSize: '0.8rem' }}>
                &copy; {new Date().getFullYear()} Matrix Delivery. All rights reserved.
            </div>
        </div>
    );
};

export default LegalLayout;
