const path = require('path');

module.exports = {
  apps: [{
    name: 'matrix-delivery-backend',
    script: './server.js',
    cwd: __dirname,
    instances: 2, // Using cluster mode with Redis adapter for session sharing
    exec_mode: 'cluster', // Cluster mode enabled - Redis adapter handles sticky sessions
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      ENV_FILE: '.env'
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 5000,
      ENV_FILE: '.env'
    },
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 5000,
      ENV_FILE: '.env.staging'
    },
    env_test: {
      NODE_ENV: 'test',
      PORT: 5000,
      ENV_FILE: '.env.testing'
    },
    production: {
      NODE_ENV: 'production',
      PORT: 5000,
      ENV_FILE: '.env.production'
    },
    error_file: path.resolve(__dirname, '../logs/pm2-error.log'),
    out_file: path.resolve(__dirname, '../logs/pm2-out.log'),
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '500M',
    autorestart: true,
    // Watch mode: enabled for development only (use --env development or --env develop)
    // Disabled in production for stability
    watch: false, // Set to true when starting with: pm2 start ecosystem.config.js --env development --watch
    watch_delay: 1000, // Wait 1 second before restarting after file change
    ignore_watch: [
      'node_modules',
      'logs',
      '.git',
      '*.log',
      'tests',
      '__tests__',
      '*.test.js',
      'coverage',
      'uploads'
    ],
    max_restarts: 10,
    min_uptime: '30s',
    restart_delay: 5000,
    kill_timeout: 30000,
    wait_ready: true,
    listen_timeout: 30000
  },
  {
    name: 'auto-deploy',
    script: path.resolve(__dirname, '../scripts/auto-deploy.sh'),
    cwd: path.resolve(__dirname, '..'),
    interpreter: '/bin/bash',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    max_restarts: 5,
    restart_delay: 10000,
    error_file: path.resolve(__dirname, '../logs/auto-deploy-error.log'),
    out_file: path.resolve(__dirname, '../logs/auto-deploy-out.log'),
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
