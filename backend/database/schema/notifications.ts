import { TableSchema } from '../types';

/**
 * Notifications table schema
 * Stores user notifications for orders and system events
 */
export const notificationsSchema: TableSchema = {
    name: 'notifications',

    createStatement: `
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL REFERENCES users(id),
      order_id VARCHAR(255) REFERENCES orders(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

    indexes: [
        'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON notifications(order_id)',
        'CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)',
        'CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)'
    ]
};
