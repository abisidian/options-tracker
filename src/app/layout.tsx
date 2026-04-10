import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Options Tracker — Bybit BTC 期权价差组合监控",
  description:
    "实时监控 Bybit BTC 期权行情，按 Call Δ>0.1 且 K>现价、Put Δ<-0.1 且 K<现价 自动枚举信用价差组合，展示最大盈利、最大亏损与盈亏比。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="min-h-dvh bg-bg text-fg antialiased">{children}</body>
    </html>
  );
}
