import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Options Tracker — Bybit BTC 期权价差组合监控",
  description:
    "实时监控 Bybit BTC 期权行情，按 Call Δ>0.1 且 K>现价、Put Δ<-0.1 且 K<现价 自动枚举信用价差组合，展示最大盈利、最大亏损与盈亏比。",
};

// 在 HTML 渲染前同步设置主题 class，避免闪烁
const themeInitScript = `
(function(){
  var t = localStorage.getItem('options-tracker-theme') || 'light';
  var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh bg-bg text-fg antialiased">{children}</body>
    </html>
  );
}
