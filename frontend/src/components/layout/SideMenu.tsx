import React, { useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import { User, Notification } from '../../types';

interface SideMenuProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User | null;
    notifications: Notification[];
    onNavigate: (view: string) => void;
    onLogout: () => void;
    onToggleOnline?: () => void;
    isDriverOnline?: boolean;
    onSwitchRole?: (role: string) => void;
    availableRoles?: string[];
    onChangeLocale?: (locale: string) => void;
    currentLocale?: string;
    t: (key: string) => string;
    onSupportClick?: () => void;
    onContactClick?: () => void;
}

const SideMenu: React.FC<SideMenuProps> = ({
    isOpen,
    onClose,
    currentUser,
    notifications,
    onNavigate,
    onLogout,
    onToggleOnline,
    isDriverOnline,
    onSwitchRole,
    availableRoles = [],
    onChangeLocale,
    currentLocale,
    t,
    onSupportClick,
    onContactClick
}) => {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    const { handleSendEmailVerification, loading: sending, error: authError } = useAuth();
    const [resent, setResent] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    // Persist dismissal per-user in localStorage
    useEffect(() => {
        const uid = (currentUser as any)?.id || (currentUser as any)?._id || (currentUser as any)?.email || 'anon';
        const key = `dismiss_verif_${uid}`;
        try {
            const v = localStorage.getItem(key);
            setDismissed(v === '1');
        } catch (e) {
            setDismissed(false);
        }
    }, [currentUser]);

    const handleResend = async () => {
        try {
            const ok = await handleSendEmailVerification();
            if (ok) {
                setResent(true);
                setTimeout(() => setResent(false), 5000);
            }
        } catch (e) {
            // swallow — useAuth surfaces errors via hook state
        }
    };

    const handleDismiss = () => {
        const uid = (currentUser as any)?.id || (currentUser as any)?._id || (currentUser as any)?.email || 'anon';
        const key = `dismiss_verif_${uid}`;
        try { localStorage.setItem(key, '1'); } catch (e) { /* ignore */ }
        setDismissed(true);
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`mobile-menu-backdrop ${isOpen ? 'open' : ''}`}
                onClick={onClose}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 2000,
                    opacity: isOpen ? 1 : 0,
                    visibility: isOpen ? 'visible' : 'hidden',
                    transition: 'opacity 0.3s ease, visibility 0.3s ease'
                }}
            />

            {/* Drawer */}
            <nav
                className={`mobile-menu ${isOpen ? 'open' : ''}`}
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: '300px',
                    background: '#111827',
                    zIndex: 2001,
                    transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.3s ease-in-out',
                    boxShadow: '-4px 0 15px rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    borderLeft: '1px solid var(--matrix-border)'
                }}
            >
                <div className="mobile-menu-items" style={{ padding: '1.5rem', overflowY: 'auto', height: '100%' }}>

                    {/* User Info Section - Enhanced */}
                    <div className="mobile-menu-section" style={{ marginBottom: '2rem', borderBottom: '1px solid #374151', paddingBottom: '1rem' }}>
                        <div
                            className="mobile-user-info"
                            style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}
                        >
                            <div
                                style={{
                                    width: '56px',
                                    height: '56px',
                                    borderRadius: '50%',
                                    background: '#374151',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    border: '2px solid var(--matrix-bright-green)',
                                    flexShrink: 0,
                                    transition: 'transform 0.2s',
                                    cursor: 'pointer'
                                }}
                                onClick={() => { onNavigate('profile'); onClose(); }}
                                onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                            >
                                {currentUser?.profile_picture_url ? (
                                    <img src={currentUser.profile_picture_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <img
                                        src={currentUser?.gender === 'female'
                                            ? '/assets/avatars/female_avatar_matrix.png'
                                            : '/assets/avatars/male_avatar_matrix.png'
                                        }
                                        alt="Default Avatar"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                    <div className="mobile-user-name" style={{ fontWeight: 'bold', color: 'white', fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {currentUser?.name}
                                    </div>
                                    {currentUser?.is_verified && (
                                        <span style={{
                                            background: '#10B981',
                                            color: 'white',
                                            padding: '0.125rem 0.375rem',
                                            borderRadius: '9999px',
                                            fontSize: '0.625rem',
                                            fontWeight: '700',
                                            flexShrink: 0
                                        }}>
                                            ✓
                                        </span>
                                    )}
                                </div>
                                <div className="mobile-user-role" style={{ color: 'var(--matrix-green)', fontSize: '0.75rem', textTransform: 'capitalize', marginBottom: '0.5rem' }}>
                                    {currentUser?.primary_role || currentUser?.role}
                                </div>
                                {/* User Stats */}
                                {currentUser?.role === 'driver' && (
                                    <div style={{ fontSize: '0.75rem', color: '#9CA3AF', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        {currentUser?.completedDeliveries !== undefined && (
                                            <div>
                                                🚚 {currentUser.completedDeliveries} {currentUser.completedDeliveries === 1 ? 'delivery' : 'deliveries'}
                                            </div>
                                        )}
                                        {currentUser?.rating !== undefined && currentUser.rating > 0 && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <span style={{ color: '#FFD700' }}>
                                                    {'★'.repeat(Math.floor(currentUser.rating))}
                                                    {currentUser.rating % 1 >= 0.5 ? '½' : ''}
                                                    {'☆'.repeat(5 - Math.ceil(currentUser.rating))}
                                                </span>
                                                <span style={{ color: '#D1D5DB', fontSize: '0.7rem' }}>
                                                    {currentUser.rating.toFixed(1)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Email verification warning (matrix-styled) */}
                        {currentUser && !currentUser.is_verified && !dismissed && (
                            <div style={{
                                marginTop: '1rem',
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                background: 'linear-gradient(180deg, rgba(2,6,5,0.55), rgba(4,10,8,0.85))',
                                border: '1px solid rgba(36,190,121,0.18)',
                                boxShadow: '0 8px 30px rgba(16,185,129,0.06), inset 0 1px 0 rgba(255,255,255,0.02)',
                                color: 'var(--matrix-bright-green)',
                                position: 'relative',
                                fontFamily: 'monospace'
                            }}>
                                <button onClick={handleDismiss} aria-label="Dismiss verification" style={{ position: 'absolute', right: 8, top: 8, background: 'transparent', border: 'none', color: 'rgba(36,190,121,0.8)', fontSize: '1rem', cursor: 'pointer' }}>×</button>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, color: 'var(--matrix-bright-green)', marginBottom: 4, wordBreak: 'break-word' }}>✉️ {t('auth.verifyYourEmail')}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'rgba(167,243,208,0.95)', wordBreak: 'break-word' }}>{t('auth.emailVerificationRequired')}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <button onClick={handleResend} disabled={sending} style={{ width: '100%', background: 'transparent', border: '1px solid rgba(36,190,121,0.12)', color: 'var(--matrix-bright-green)', padding: '8px 10px', borderRadius: 8, cursor: 'pointer' }}>{sending ? t('auth.sending') : (resent ? t('auth.resent') : t('auth.resendVerification'))}</button>
                                        <button onClick={() => { onNavigate('profile'); onClose(); }} style={{ width: '100%', background: 'linear-gradient(90deg,#24be79,#10b981)', border: 'none', color: '#041014', padding: '8px 10px', borderRadius: 8, cursor: 'pointer' }}>{t('auth.verifyNow') || 'Verify'}</button>
                                    </div>
                                </div>
                                {authError && <div style={{ marginTop: 8, color: '#FCA5A5', fontSize: '0.8rem' }}>{authError}</div>}
                            </div>
                        )}
                    </div>

                    {/* Navigation Links */}
                    <div className="mobile-menu-section" style={{ marginBottom: '2rem' }}>
                        <h4 style={{ color: '#9CA3AF', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '1rem', letterSpacing: '0.05em' }}>
                            Menu
                        </h4>

                        <button
                            onClick={() => { onNavigate('home'); onClose(); }}
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem', borderRadius: '0.5rem', marginBottom: '0.5rem', transition: 'background 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            🏠 Home / Active Orders
                        </button>

                        {currentUser?.role === 'driver' && (
                            <button
                                onClick={() => { onNavigate('earnings'); onClose(); }}
                                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem', borderRadius: '0.5rem', marginBottom: '0.5rem', transition: 'background 0.2s' }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                💰 Earnings Dashboard
                            </button>
                        )}

                        <button
                            onClick={() => { onNavigate('notifications'); onClose(); }}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left', padding: '0.75rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem', borderRadius: '0.5rem', marginBottom: '0.5rem', transition: 'background 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <span>🔔 Notifications</span>
                            {unreadCount > 0 && (
                                <span style={{ background: '#EF4444', color: 'white', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => { onNavigate('settings'); onClose(); }}
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem', borderRadius: '0.5rem', marginBottom: '0.5rem', transition: 'background 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            ⚙️ Settings
                        </button>

                        {/* Admin Panel - Only for admins */}
                        {(currentUser?.role === 'admin' || (currentUser?.granted_roles && currentUser.granted_roles.includes('admin')) || availableRoles.includes('admin')) && (
                            <button
                                onClick={() => { onNavigate('admin_panel'); onClose(); }}
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '0.75rem',
                                    background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(99, 102, 241, 0.1) 100%)',
                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                    color: '#A5B4FC',
                                    cursor: 'pointer',
                                    fontSize: '1rem',
                                    borderRadius: '0.5rem',
                                    marginBottom: '0.5rem',
                                    transition: 'all 0.2s',
                                    fontWeight: '600'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(79, 70, 229, 0.3) 0%, rgba(99, 102, 241, 0.2) 100%)';
                                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(99, 102, 241, 0.1) 100%)';
                                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                                }}
                            >
                                🛡️ Admin Panel
                            </button>
                        )}
                    </div>

                    {/* Driver Actions */}
                    {currentUser?.role === 'driver' && (
                        <div className="mobile-menu-section" style={{ marginBottom: '2rem' }}>
                            <h4 style={{ color: '#9CA3AF', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '1rem', letterSpacing: '0.05em' }}>
                                Driver Actions
                            </h4>

                            <button
                                onClick={() => { onNavigate('bidding'); onClose(); }}
                                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem', borderRadius: '0.5rem', marginBottom: '0.5rem', transition: 'background 0.2s' }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                📋 Available Bids
                            </button>

                            <button
                                onClick={() => { onNavigate('map'); onClose(); }}
                                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem', borderRadius: '0.5rem', marginBottom: '0.5rem', transition: 'background 0.2s' }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                🗺️ Orders Map
                            </button>

                            <button
                                onClick={() => { onNavigate('my_bids'); onClose(); }}
                                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem', borderRadius: '0.5rem', marginBottom: '0.5rem', transition: 'background 0.2s' }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                🎯 My Bids
                            </button>

                            <button
                                onClick={() => { onNavigate('location_settings'); onClose(); }}
                                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem', borderRadius: '0.5rem', marginBottom: '0.5rem', transition: 'background 0.2s' }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                📍 Location
                            </button>

                            <button
                                onClick={() => { onNavigate('history'); onClose(); }}
                                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem', borderRadius: '0.5rem', marginBottom: '0.5rem', transition: 'background 0.2s' }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                📜 My History
                            </button>
                        </div>
                    )}

                    {/* Driver Controls */}
                    {currentUser?.role === 'driver' && onToggleOnline && (
                        <div className="mobile-menu-section" style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '0.5rem' }}>
                            <h4 style={{ color: '#9CA3AF', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '1rem', letterSpacing: '0.05em' }}>
                                Driver Status
                            </h4>
                            <button
                                onClick={onToggleOnline}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '0.5rem',
                                    border: 'none',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    background: isDriverOnline ? '#EF4444' : '#10B981',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                {isDriverOnline ? '🔴 Go Offline' : '🟢 Go Online'}
                            </button>
                        </div>
                    )}

                    {/* Legal Section */}
                    <div className="mobile-menu-section" style={{ marginTop: '2rem' }}>
                        <h4 style={{ color: '#9CA3AF', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '1rem', letterSpacing: '0.05em' }}>
                            Legal
                        </h4>
                        <button onClick={() => { onNavigate('legal_privacy'); onClose(); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem', borderRadius: '0.5rem', marginBottom: '0.5rem', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                            🔒 Privacy Policy
                        </button>
                        <button onClick={() => { onNavigate('legal_terms'); onClose(); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem', borderRadius: '0.5rem', marginBottom: '0.5rem', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                            📜 Terms of Service
                        </button>
                        <button onClick={() => { onNavigate('legal_refund'); onClose(); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem', borderRadius: '0.5rem', marginBottom: '0.5rem', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                            💸 Refund Policy
                        </button>
                        <button onClick={() => { onNavigate('legal_driver_agreement'); onClose(); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem', borderRadius: '0.5rem', marginBottom: '0.5rem', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                            🤝 Driver Agreement
                        </button>
                        <button onClick={() => { onNavigate('legal_cookies'); onClose(); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem', borderRadius: '0.5rem', marginBottom: '0.5rem', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                            🍪 Cookie Policy
                        </button>
                    </div>

                    {/* Settings & System */}
                    <div className="mobile-menu-section" style={{ marginTop: '2rem' }}>
                        <h4 style={{ color: '#9CA3AF', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '1rem', letterSpacing: '0.05em' }}>
                            System
                        </h4>


                        <button
                            onClick={() => { if (onContactClick) onContactClick(); onClose(); }}
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem', borderRadius: '0.5rem', marginBottom: '0.5rem', transition: 'background 0.2s', fontWeight: 'bold' }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            📞 Contact Us
                        </button>

                        {/* Crypto Test - Only in development/staging */}
                        {process.env.REACT_APP_ENV !== 'production' && (
                            <button
                                onClick={() => { onNavigate('crypto-test'); onClose(); }}
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '0.75rem',
                                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.1) 100%)',
                                    border: '1px solid rgba(102, 126, 234, 0.3)',
                                    color: '#A78BFA',
                                    cursor: 'pointer',
                                    fontSize: '1rem',
                                    borderRadius: '0.5rem',
                                    marginBottom: '0.5rem',
                                    transition: 'all 0.2s',
                                    fontWeight: '600'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.2) 100%)';
                                    e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.5)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.1) 100%)';
                                    e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.3)';
                                }}
                            >
                                🧪 Crypto Test
                            </button>
                        )}

                        <button
                            onClick={() => { if (onSupportClick) onSupportClick(); onClose(); }}
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem', background: 'transparent', border: 'none', color: '#10B981', cursor: 'pointer', fontSize: '1rem', borderRadius: '0.5rem', marginBottom: '0.5rem', transition: 'background 0.2s', fontWeight: 'bold' }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            ☕ Support Developer
                        </button>





                        <button
                            onClick={onLogout}
                            className="btn-danger"
                            style={{ width: '100%', marginTop: '1rem' }}
                        >
                            {t('auth.logout')}
                        </button>
                    </div>

                </div>
            </nav>
        </>
    );
};

export default SideMenu;
