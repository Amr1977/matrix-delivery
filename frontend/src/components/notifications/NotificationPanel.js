import React from 'react';
import { useI18n } from '../../i18n/i18nContext';
import { formatRelativeTime } from '../../utils/formatters';

const NotificationPanel = ({ notifications, onMarkAsRead, showHeader = true }) => {
  const { t } = useI18n();

  return (
    <div className="notification-panel">
      {showHeader && (
        <div style={{ padding: 'var(--spacing-md)', borderBottom: '2px solid var(--matrix-border)' }}>
          <h3 style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--matrix-bright-green)' }}>Notifications</h3>
        </div>
      )}
      {notifications.length === 0 ? (
        <p style={{ padding: 'var(--spacing-md)', textAlign: 'center', color: 'var(--matrix-green)' }}>No notifications</p>
      ) : (
        notifications.map((notif) => (
          <div
            key={notif.id}
            onClick={() => onMarkAsRead(notif.id)}
            className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
          >
            <p style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.25rem', color: 'var(--matrix-bright-green)' }}>{notif.title}</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--matrix-green)' }}>{notif.message}</p>
            <p style={{ fontSize: '0.75rem', color: 'rgba(0, 255, 0, 0.6)', marginTop: '0.25rem' }}>
              {formatRelativeTime(notif.createdAt)}
            </p>
          </div>
        ))
      )}
    </div>
  );
};

export default NotificationPanel;
