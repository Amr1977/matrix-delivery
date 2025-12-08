import { TableSchema } from '../types';

/**
 * Logs table schema
 * Stores application logs from both frontend and backend
 */
export const logsSchema: TableSchema = {
    name: 'logs',

    createStatement: `
    CREATE TABLE IF NOT EXISTS logs (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      level VARCHAR(20) NOT NULL CHECK (level IN ('error', 'warn', 'info', 'debug', 'http')),
      source VARCHAR(20) NOT NULL CHECK (source IN ('frontend', 'backend')),
      category VARCHAR(50),
      message TEXT NOT NULL,
      user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
      session_id VARCHAR(100),
      url TEXT,
      method VARCHAR(10),
      status_code INTEGER,
      duration_ms INTEGER,
      ip_address VARCHAR(45),
      user_agent TEXT,
      stack_trace TEXT,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

    indexes: [
        'CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC)',
        'CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level)',
        'CREATE INDEX IF NOT EXISTS idx_logs_source ON logs(source)',
        'CREATE INDEX IF NOT EXISTS idx_logs_category ON logs(category)',
        'CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_logs_session_id ON logs(session_id)'
    ]
};
