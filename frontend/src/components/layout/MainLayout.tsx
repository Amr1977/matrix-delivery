import React, { useState, useEffect } from 'react';
import SideMenu from './SideMenu';
import Footer from './Footer';
import SupportDeveloperModal from './SupportDeveloperModal';
import ContactUsModal from './ContactUsModal';
import { User, Notification } from '../../types';

interface MainLayoutProps {
    children: React.ReactNode;
    currentUser: User | null;
    notifications: Notification[];
    onNavigate: (view: string) => void;
    onLogout: () => void;
    onToggleOnline?: () => void;
    isDriverOnline?: boolean;
    onSwitchRole?: (primary_role: string) => void;
    availableRoles?: string[];
    onChangeLocale?: (locale: string) => void;
    currentLocale?: string;
    t: (key: string) => string;
    unreadCount?: number;
    footerStats?: any;
}

const MainLayout: React.FC<MainLayoutProps> = ({
    children,
    currentUser,
    notifications,
    onNavigate,
    onLogout,
    onToggleOnline,
    isDriverOnline,
    onSwitchRole,
    availableRoles,
    onChangeLocale,
    currentLocale,
    t,
    unreadCount = 0,
    footerStats
}) => {
    const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
    const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);

    // Close menu when clicking outside (handled by backdrop in SideMenu) or pressing Escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsSideMenuOpen(false);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    // Prevent body scroll when menu is open
    useEffect(() => {
        if (isSideMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isSideMenuOpen]);

    return (
        <div style={{ minHeight: '100vh', background: '#090909', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <header className="glow" style={{ position: 'sticky', top: 0, zIndex: 1000 }}>
                <div className="header-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem' }}>

                    {/* Logo */}
                    <div className="header-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img
                            src="/branding-hero-1.png"
                            alt="Matrix Heroes"
                            className="pulse"
                            style={{ width: '40px', height: '40px' }}
                        />
                        <h1 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--matrix-bright-green)', textShadow: 'var(--shadow-glow)' }}>
                            {t('common.appName')}
                        </h1>
                    </div>

                    {/* Right Side Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

                        {/* Notification Bell (Desktop Shortcut) */}
                        <button
                            onClick={() => onNavigate('notifications')}
                            className={`notification-bell ${unreadCount > 0 ? 'bell-notification' : ''}`}
                            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', position: 'relative', overflow: 'visible' }}
                            aria-label={t('menu.notifications')}
                        >
                            🔔
                            {unreadCount > 0 && (
                                <span className="notification-badge" style={{
                                    position: 'absolute',
                                    top: '-2px',
                                    right: '-2px',
                                    background: '#EF4444',
                                    color: 'white',
                                    fontSize: '0.7rem',
                                    padding: '3px 7px',
                                    borderRadius: '10px',
                                    fontWeight: 'bold',
                                    minWidth: '20px',
                                    textAlign: 'center',
                                    boxShadow: '0 0 10px rgba(239, 68, 68, 0.6)'
                                }}>
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Hamburger Button (Universal) */}
                        <button
                            className={`hamburger-btn ${isSideMenuOpen ? 'open' : ''}`}
                            onClick={() => setIsSideMenuOpen(!isSideMenuOpen)}
                            aria-label={t('common.menu')}
                            data-testid="hamburger-btn"
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-around',
                                width: '2rem',
                                height: '2rem',
                                padding: '0',
                                zIndex: 2002 // Above side menu
                            }}
                        >
                            <span style={{
                                width: '2rem',
                                height: '0.25rem',
                                background: 'var(--matrix-bright-green)',
                                borderRadius: '10px',
                                transition: 'all 0.3s linear',
                                transform: isSideMenuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'rotate(0)'
                            }} />
                            <span style={{
                                width: '2rem',
                                height: '0.25rem',
                                background: 'var(--matrix-bright-green)',
                                borderRadius: '10px',
                                transition: 'all 0.3s linear',
                                opacity: isSideMenuOpen ? 0 : 1,
                                transform: isSideMenuOpen ? 'translateX(20px)' : 'translateX(0)'
                            }} />
                            <span style={{
                                width: '2rem',
                                height: '0.25rem',
                                background: 'var(--matrix-bright-green)',
                                borderRadius: '10px',
                                transition: 'all 0.3s linear',
                                transform: isSideMenuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'rotate(0)'
                            }} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Side Menu */}
            <SideMenu
                isOpen={isSideMenuOpen}
                onClose={() => setIsSideMenuOpen(false)}
                currentUser={currentUser}
                notifications={notifications}
                onNavigate={onNavigate}
                onLogout={onLogout}
                onToggleOnline={onToggleOnline}
                isDriverOnline={isDriverOnline}
                onSwitchRole={onSwitchRole}
                availableRoles={availableRoles}
                onChangeLocale={onChangeLocale}
                currentLocale={currentLocale}
                t={t}
                onSupportClick={() => {
                    setIsSideMenuOpen(false);
                    setIsSupportModalOpen(true);
                }}
                onContactClick={() => {
                    setIsSideMenuOpen(false);
                    setIsContactModalOpen(true);
                }}
            />

            <SupportDeveloperModal
                isOpen={isSupportModalOpen}
                onClose={() => setIsSupportModalOpen(false)}
            />

            <ContactUsModal
                isOpen={isContactModalOpen}
                onClose={() => setIsContactModalOpen(false)}
            />

            {/* Main Content */}
            <main style={{ flex: 1, position: 'relative', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1 }}>
                    {children}
                </div>

                <Footer footerStats={footerStats} />
            </main>
        </div>
    );
};

export default MainLayout;
