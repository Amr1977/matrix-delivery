import React from 'react';

interface FooterProps {
    footerStats?: any;
    t?: (key: string) => string;
}

const Footer: React.FC<FooterProps> = ({ footerStats }) => {
    const version = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_VERSION) || '1.0.0';
    const commit = footerStats?.commit || 'unknown';

    return (
        <footer className="site-footer" style={{
            padding: '1rem',
            textAlign: 'center',
            fontSize: '0.75rem',
            color: '#6B7280',
            borderTop: '1px solid #E5E7EB',
            background: '#F9FAFB'
        }}>
            <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
                <p style={{ margin: 0 }}>
                    {`Matrix Delivery v${version} | Commit: ${commit} | ${new Date().toLocaleDateString()}`}
                </p>
            </div>
        </footer>
    );
};

export default Footer;
