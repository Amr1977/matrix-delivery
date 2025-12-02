import React from 'react';
import { User, Notification } from '../types';

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
    t
}) => {
    const unreadCount = notifications.filter(n => !n.isRead).length;

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

                    {/* User Info Section */}
                    <div className="mobile-menu-section" style={{ marginBottom: '2rem', borderBottom: '1px solid #374151', paddingBottom: '1rem' }}>
                        <div className="mobile-user-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: '#374151',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                border: '2px solid var(--matrix-bright-green)'
                            }}>
                                {currentUser?.profile_picture_url ? (
                                    <img src={currentUser.profile_picture_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span style={{ fontSize: '1.5rem' }}>👤</span>
                                )}
                            </div>
                            <div>
                                <div className="mobile-user-name" style={{ fontWeight: 'bold', color: 'white', fontSize: '1.1rem' }}>
                                    {currentUser?.name}
                                </div>
                                <div className="mobile-user-role" style={{ color: 'var(--matrix-green)', fontSize: '0.875rem', textTransform: 'capitalize' }}>
                                    {currentUser?.role}
                                </div>
                            </div>
                        </div>
                        {currentUser?.isVerified && (
                            <div style={{ marginTop: '0.5rem', display: 'inline-block', background: '#10B981', color: 'white', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600' }}>
                                ✓ Verified Account
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
                            onClick={() => { onNavigate('profile'); onClose(); }}
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem', borderRadius: '0.5rem', marginBottom: '0.5rem', transition: 'background 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            👤 My Profile
                        </button>

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
                    </div>

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

                    {/* Settings & System */}
                    <div className="mobile-menu-section" style={{ marginTop: 'auto' }}>
                        <h4 style={{ color: '#9CA3AF', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '1rem', letterSpacing: '0.05em' }}>
                            System
                        </h4>

                        {/* Language */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', color: '#D1D5DB', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Language</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {['en', 'ar', 'tr'].map(lang => (
                                    <button
                                        key={lang}
                                        onClick={() => onChangeLocale && onChangeLocale(lang)}
                                        style={{
                                            flex: 1,
                                            padding: '0.5rem',
                                            background: currentLocale === lang ? 'var(--matrix-bright-green)' : '#374151',
                                            color: currentLocale === lang ? 'black' : 'white',
                                            border: 'none',
                                            borderRadius: '0.25rem',
                                            cursor: 'pointer',
                                            textTransform: 'uppercase',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        {lang}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Role Switcher */}
                        {availableRoles.length > 1 && onSwitchRole && (
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', color: '#D1D5DB', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Switch Role</label>
                                <select
                                    value={currentUser?.role}
                                    onChange={(e) => onSwitchRole(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        background: '#374151',
                                        color: 'white',
                                        border: '1px solid #4B5563',
                                        borderRadius: '0.375rem'
                                    }}
                                >
                                    {availableRoles.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>
                        )}

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
