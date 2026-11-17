module.exports = {
  apps: [
    {
      name: 'nuxt-net-monitoring',
      cwd: __dirname,
      script: '.output/server/index.mjs',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      time: true,
      kill_timeout: 5000,
      env_production: {
        NODE_ENV: 'production',
        NITRO_HOST: '0.0.0.0',
        NITRO_PORT: 3000,
      },
    },
  ],
}
