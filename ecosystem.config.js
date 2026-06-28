module.exports = {
  apps: [
    {
      name: 'smartcity-backend',
      script: './server.js',
      instances: 'max', // Utilizes all available CPU cores
      exec_mode: 'cluster', // Enables load-balanced cluster mode
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
