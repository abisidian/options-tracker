import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "var(--color-bg)",
          card: "var(--color-bg-card)",
          muted: "var(--color-bg-muted)",
          elevated: "var(--color-bg-elevated)",
        },
        fg: {
          DEFAULT: "var(--color-fg)",
          muted: "var(--color-fg-muted)",
          dim: "var(--color-fg-dim)",
        },
        border: {
          DEFAULT: "var(--color-border)",
          subtle: "var(--color-border-subtle)",
        },
        profit: "var(--color-profit)",
        loss: "var(--color-loss)",
        warn: "var(--color-warn)",
        info: "var(--color-info)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "0.875rem" }],   // 11px / 14px
        xs:    ["0.75rem",   { lineHeight: "1rem" }],        // 12px / 16px
        sm:    ["0.8125rem", { lineHeight: "1.25rem" }],     // 13px / 20px
        base:  ["0.875rem",  { lineHeight: "1.375rem" }],    // 14px / 22px
      },
      spacing: {
        row: "36px",
      },
      borderRadius: {
        DEFAULT: "8px",
        lg: "10px",
        xl: "12px",
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
