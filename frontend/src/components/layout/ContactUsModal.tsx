import React from 'react';

interface ContactUsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ContactUsModal: React.FC<ContactUsModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const whatsappNumber = "+201094450141";
    const whatsappLink = `https://wa.me/${whatsappNumber.replace('+', '')}`;
    const facebookLink = "https://www.facebook.com/profile.php?id=61584443774093";
    const linkedinLink = "https://www.linkedin.com/company/matrix-delivery-platform";

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backdropFilter: 'blur(5px)'
        }} onClick={onClose}>
            <div style={{
                background: '#0a0a0a',
                border: '1px solid var(--matrix-bright-green)',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '500px',
                width: '100%',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)',
                position: 'relative',
                maxHeight: '90vh',
                overflowY: 'auto'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #333', paddingBottom: '12px' }}>
                    <h2 style={{ margin: 0, color: 'var(--matrix-bright-green)', fontFamily: 'monospace', fontSize: '1.5rem' }}>
                        📞 Contact Us
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#666',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={e => {
                            e.currentTarget.style.color = '#fff';
                            e.currentTarget.style.background = '#333';
                        }}
                        onMouseOut={e => {
                            e.currentTarget.style.color = '#666';
                            e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        &times;
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* WhatsApp */}
                    <div style={{ background: '#111', padding: '16px', borderRadius: '8px', border: '1px solid #333' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#25D366', fontWeight: 'bold' }}>
                            💬 WhatsApp
                        </div>
                        <div style={{ marginBottom: '12px', color: '#ccc', fontFamily: 'monospace' }}>
                            {whatsappNumber}
                        </div>
                        <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'block',
                                textAlign: 'center',
                                background: '#25D366',
                                color: 'white',
                                textDecoration: 'none',
                                padding: '12px',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                transition: 'transform 0.1s'
                            }}
                            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            Contact on WhatsApp
                        </a>
                    </div>

                    {/* Facebook */}
                    <div style={{ background: '#111', padding: '16px', borderRadius: '8px', border: '1px solid #333' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#1877F2', fontWeight: 'bold' }}>
                            📘 Facebook
                        </div>
                        <a
                            href={facebookLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'block',
                                textAlign: 'center',
                                background: '#1877F2',
                                color: 'white',
                                textDecoration: 'none',
                                padding: '12px',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                transition: 'transform 0.1s'
                            }}
                            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            Visit Facebook
                        </a>
                    </div>

                    {/* LinkedIn */}
                    <div style={{ background: '#111', padding: '16px', borderRadius: '8px', border: '1px solid #333' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#0A66C2', fontWeight: 'bold' }}>
                            💼 LinkedIn
                        </div>
                        <a
                            href={linkedinLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'block',
                                textAlign: 'center',
                                background: '#0A66C2',
                                color: 'white',
                                textDecoration: 'none',
                                padding: '12px',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                transition: 'transform 0.1s'
                            }}
                            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            Visit LinkedIn
                        </a>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ContactUsModal;
