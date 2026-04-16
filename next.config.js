const os = require("os");

/**
 * 将环境变量中的来源统一转换为 Next.js 需要的 host[:port] 形式。
 * 支持传完整 URL，也支持直接传 host 或 host:port。
 */
function normalizeAllowedOrigin(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed).host;
  } catch {
    return trimmed.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

/**
 * 收集当前机器可用的 IPv4 地址，兼容通过局域网 IP 访问开发服务的场景。
 */
function getLocalIpv4Origins(port) {
  const networks = os.networkInterfaces();
  const origins = [];

  for (const addresses of Object.values(networks)) {
    for (const address of addresses ?? []) {
      if (address.family !== "IPv4" || address.internal) {
        continue;
      }
      origins.push(`${address.address}:${port}`);
    }
  }

  return origins;
}

/**
 * 汇总 Next.js 开发态允许的来源，避免 localhost、127.0.0.1、机器名或局域网 IP
 * 访问同一个 dev server 时触发 `Origin not allowed`。
 */
function getAllowedOrigins() {
  const port = process.env.PORT || "4000";
  const hostname = os.hostname();
  const envOrigins = (process.env.NEXT_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => normalizeAllowedOrigin(value))
    .filter(Boolean);

  return Array.from(
    new Set([
      `localhost:${port}`,
      `127.0.0.1:${port}`,
      `${hostname}:${port}`,
      `${hostname}.local:${port}`,
      normalizeAllowedOrigin(process.env.APP_URL),
      normalizeAllowedOrigin(process.env.NEXT_PUBLIC_APP_URL),
      normalizeAllowedOrigin(process.env.VERCEL_URL),
      ...getLocalIpv4Origins(port),
      ...envOrigins,
    ].filter(Boolean)),
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Next.js 开发态会校验请求来源；这里放行本地常见访问入口，并允许通过环境变量追加。
      allowedOrigins: getAllowedOrigins(),
    },
  },
  webpack: (config) => {
    // 挂载卷上 fsevents 不生效，改用轮询监听文件变化
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    };
    return config;
  },
};

module.exports = nextConfig;
