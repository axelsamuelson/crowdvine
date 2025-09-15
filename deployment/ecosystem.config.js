module.exports = {
  apps: [{
    name: 'crowdvine',
    script: 'npm',
    args: 'start',
    cwd: '/path/to/your/app',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
