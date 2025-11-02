module.exports = {
  apps: [{
    name: 'matrix-delivery-backend',
    script: './server.js',
    cwd: 'D:\\matrix-delivery\\backend',
    instances: 2, // CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      ENV_FILE: '.env.production'
    },
    env_develop: {
      NODE_ENV: 'development',
      PORT: 5000,
      ENV_FILE: '.env.develop'
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
      ENV_FILE: '.env.production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '500M',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
