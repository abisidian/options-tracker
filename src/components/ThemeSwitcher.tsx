"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "options-tracker-theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  // 初始化：从 localStorage 读取
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial = stored && ["light", "dark", "system"].includes(stored) ? stored : "light";
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  // theme 变化时应用
  useEffect(() => {
    if (!mounted) return;
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, mounted]);

  // 监听系统主题变化（仅 system 模式下生效）
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") applyTheme("system");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  if (!mounted) return null;

  const options: { value: Theme; label: string; icon: string }[] = [
    { value: "light", label: "浅色", icon: "☀" },
    { value: "dark", label: "深色", icon: "☾" },
    { value: "system", label: "系统", icon: "◑" },
  ];

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border-subtle bg-bg-muted p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          className={`rounded-md px-2 py-1 text-2xs transition-colors ${
            theme === opt.value
              ? "bg-bg-elevated text-fg shadow-sm"
              : "text-fg-dim hover:text-fg-muted"
          }`}
          title={opt.label}
        >
          <span className="mr-1">{opt.icon}</span>
          <span className="hidden sm:inline">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
