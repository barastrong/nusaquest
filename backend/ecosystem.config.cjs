module.exports = {
  apps: [
    {
      name: 'nusaquest-backend',
      script: 'src/server.js',
      cwd: '/opt/www/infinitera/backend',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
