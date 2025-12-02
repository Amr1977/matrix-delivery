import React from 'react';
import { User, Notification } from '../../types';
import LanguageSwitcher from '../../LanguageSwitcher';

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
                                    <span style={{ fontSize: '1.75rem' }}>👤</span>
                                )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                    <div className="mobile-user-name" style={{ fontWeight: 'bold', color: 'white', fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {currentUser?.name}
                                    </div>
                                    {currentUser?.isVerified && (
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
                                    {currentUser?.role}
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
                                🗺️ Map View
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

                    {/* Settings & System */}
                    <div className="mobile-menu-section" style={{ marginTop: 'auto' }}>
                        <h4 style={{ color: '#9CA3AF', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '1rem', letterSpacing: '0.05em' }}>
                            System
                        </h4>



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
