import React, { useState } from 'react';

interface SupportDeveloperModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SupportDeveloperModal: React.FC<SupportDeveloperModalProps> = ({ isOpen, onClose }) => {
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopyFeedback(label);
        setTimeout(() => setCopyFeedback(null), 2000);
    };

    const vodafoneNumber = "+201094450141";
    const usdtAddress = "TGokJ43uzZvxwMAAsPaAtFmakZ1iQr4WTS";
    const trustWalletLink = "https://link.trustwallet.com/send?coin=195&address=TGokJ43uzZvxwMAAsPaAtFmakZ1iQr4WTS&token_id=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

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
                        ☕ Support Developer
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

                    {/* Vodafone Cash */}
                    <div style={{ background: '#111', padding: '16px', borderRadius: '8px', border: '1px solid #333' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#e60000', fontWeight: 'bold' }}>
                            📱 Vodafone Cash
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#000', padding: '12px', borderRadius: '6px', border: '1px solid #222' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: '#fff' }}>{vodafoneNumber}</span>
                            <button
                                onClick={() => handleCopy(vodafoneNumber, 'vodafone')}
                                style={{
                                    background: copyFeedback === 'vodafone' ? '#10B981' : '#333',
                                    color: 'white',
                                    border: 'none',
                                    padding: '6px 12px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontSize: '0.9rem'
                                }}
                            >
                                {copyFeedback === 'vodafone' ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    </div>

                    {/* Crypto Section */}
                    <div style={{ background: '#111', padding: '16px', borderRadius: '8px', border: '1px solid #333' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#50AF95', fontWeight: 'bold' }}>
                            💎 USDT (TRON/TRC20)
                        </div>

                        {/* QR Code */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', background: 'white', padding: '16px', borderRadius: '8px' }}>
                            <img
                                src="/support-qr.jpg"
                                alt="USDT QR Code"
                                style={{
                                    maxWidth: '100%',
                                    height: 'auto',
                                    maxHeight: '200px',
                                    display: 'block'
                                }}
                            />
                        </div>

                        {/* Address */}
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '4px' }}>Wallet Address:</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{
                                    background: '#000',
                                    padding: '12px',
                                    borderRadius: '6px',
                                    border: '1px solid #222',
                                    wordBreak: 'break-all',
                                    fontFamily: 'monospace',
                                    fontSize: '0.9rem',
                                    color: '#ccc'
                                }}>
                                    {usdtAddress}
                                </div>
                                <button
                                    onClick={() => handleCopy(usdtAddress, 'usdt')}
                                    style={{
                                        background: copyFeedback === 'usdt' ? '#10B981' : '#333',
                                        color: 'white',
                                        border: 'none',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        width: '100%'
                                    }}
                                >
                                    {copyFeedback === 'usdt' ? 'Address Copied!' : 'Copy Address'}
                                </button>
                            </div>
                        </div>

                        {/* Trust Wallet Link */}
                        <a
                            href={trustWalletLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'block',
                                textAlign: 'center',
                                background: 'linear-gradient(45deg, #3375BB, #50AF95)',
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
                            Pay via Trust Wallet 🛡️
                        </a>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SupportDeveloperModal;
