const os = require('os');

module.exports = {
  apps: [{
    name: 'matrix-delivery-backend',
    script: './server.js',
    // cwd: '/root/matrix-delivery/backend', // Removed to support cross-platform (defaults to current dir)
    instances: os.platform() === 'win32' ? 1 : 2, // 1 instance on Windows (fork), 2 on Linux (cluster)
    exec_mode: os.platform() === 'win32' ? 'fork' : 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      ENV_FILE: '.env'
    },
    env_develop: {
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
      ENV_FILE: '.env.test'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
      ENV_FILE: '.env'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '500M',
    autorestart: true,
    watch: false, // Enable with --watch for development
    ignore_watch: ['node_modules', 'logs', '.git'],
    max_restarts: 10,
    min_uptime: '30s',
    restart_delay: 5000,
    kill_timeout: 30000,
    wait_ready: true,
    listen_timeout: 30000
  }, {
    name: 'matrix-delivery-frontend',
    script: 'node_modules/react-scripts/scripts/start.js',
    args: '',
    cwd: '../frontend', // Relative to this file
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    }
  }]
};
