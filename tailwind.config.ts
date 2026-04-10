import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Financial Dashboard dark palette
        bg: {
          DEFAULT: "#020617",
          card: "#0E1223",
          muted: "#1A1E2F",
          elevated: "#141a2e",
        },
        fg: {
          DEFAULT: "#F8FAFC",
          muted: "#94A3B8",
          dim: "#64748B",
        },
        border: {
          DEFAULT: "#334155",
          subtle: "#1E293B",
        },
        profit: "#22C55E",
        loss: "#EF4444",
        warn: "#F59E0B",
        info: "#3B82F6",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["11px", "14px"],
        xs: ["12px", "16px"],
        sm: ["13px", "18px"],
        base: ["14px", "20px"],
      },
      spacing: {
        row: "36px",
      },
      transitionDuration: {
        DEFAULT: "200ms",
      },
    },
  },
  plugins: [],
};

export default config;
