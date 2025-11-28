import React from 'react';

const MobileNavBar = ({ unreadCount, setShowNotifications, setShowProfile, setShowMessaging, toggleMobileMenu }) => {

  return (
    <nav className="mobile-nav-bar">
      <button className="nav-item" onClick={toggleMobileMenu}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor" />
        </svg>
      </button>

      <button className="nav-item" onClick={() => setShowNotifications(prev => !prev)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22c1.1 0 2-0.9 2-2h-4c0 1.1 0.9 2 2 2zM18 16v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-0.83-0.67-1.5-1.5-1.5S10.5 3.17 10.5 4v0.68C7.63 5.36 6 7.93 6 11v5l-2 2v1h16v-1l-2-2z" fill="currentColor" />
        </svg>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      <button className="nav-item" onClick={() => setShowMessaging(true)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM7 9h10c.55 0 1 .45 1 1s-.45 1-1 1H7c-.55 0-1-.45-1-1s.45-1 1-1zm0 3h7c.55 0 1 .45 1 1s-.45 1-1 1H7c-.55 0-1-.45-1-1s.45-1 1-1z" fill="currentColor" />
        </svg>
      </button>

      <button className="nav-item" onClick={() => setShowProfile(prev => !prev)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor" />
        </svg>
      </button>
    </nav>
  );
};

export default MobileNavBar;
