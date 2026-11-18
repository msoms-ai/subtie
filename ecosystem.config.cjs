module.exports = {
  apps: [
    {
      name: 'subtie',
      script: 'server/index.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1500M',
      restart_delay: 2000,
      max_restarts: 50,
      min_uptime: '10s',
      exp_backoff_restart_delay: 100,
      node_args: '--max-old-space-size=2048',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './server/logs/pm2-error.log',
      out_file: './server/logs/pm2-out.log',
      time: true
    },
    {
      name: 'subtie-worker',
      script: 'server/worker.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '3000M',
      restart_delay: 3000,
      max_restarts: 50,
      min_uptime: '15s',
      node_args: '--max-old-space-size=4096',
      env: {
        NODE_ENV: 'production',
        WORKER_CONCURRENCY: 2
      },
      error_file: './server/logs/worker-error.log',
      out_file: './server/logs/worker-out.log',
      time: true
    },
    {
      name: 'subtie-watchdog',
      script: 'scripts/watchdog.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '250M',
      restart_delay: 5000,
      args: '--daemon',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './server/logs/watchdog-error.log',
      out_file: './server/logs/watchdog-out.log',
      time: true
    }
  ]
};
