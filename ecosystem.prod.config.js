module.exports = {
  apps: [
    {
      name: 'web-prod',
      script: './node_modules/.bin/nuxt',
      args: 'start',
      cwd: './apps/web',
      env: {
        NODE_ENV: 'production',
        PORT: "3001",
        HOST: '0.0.0.0'
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      log_file: './logs/web-prod.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Auto restart on failure
      autorestart: true,
      max_restarts: 5,
      min_uptime: '10s'
    }
  ]
}
