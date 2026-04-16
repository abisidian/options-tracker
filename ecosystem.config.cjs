/**
 * PM2 生产进程配置。
 * 复用项目已有的 `npm run start` 启动 Next.js 生产服务，默认监听 4000 端口。
 */
module.exports = {
  apps: [
    {
      // 统一应用名，便于 GitHub Actions 在服务器上执行 reload。
      name: "options-tracker",
      cwd: __dirname,
      script: "npm",
      args: "run start",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "4000",
      },
    },
  ],
};
