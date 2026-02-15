module.exports = {
  apps: [
    {
      name: 'web-dev',
      script: './node_modules/.bin/nuxt',
      args: 'dev --https --https.cert ../../.certs/cert.pem --https.key ../../.certs/key.pem',
      cwd: './apps/web',
      env: {
        NODE_ENV: 'development',
        NODE_TLS_REJECT_UNAUTHORIZED: '0'
      },
      watch: false,
      max_memory_restart: '1G',
      log_file: './logs/web-dev.log',
      out_file: './logs/web-dev-out.log',
      error_file: './logs/web-dev-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    }
  ]
}