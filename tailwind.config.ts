import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        geass: {
          bg: "#06060b",
          card: "#0c0c14",
          "card-hover": "#10101c",
          border: "#1a1a2e",
          "border-bright": "#2a2a4e",
          accent: "#6366f1",
          "accent-bright": "#818cf8",
          purple: "#8b5cf6",
          crimson: "#dc2626",
          green: "#22c55e",
          red: "#ef4444",
          gold: "#f59e0b",
        },
      },
      fontFamily: {
        display: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out",
        "pulse-slow": "pulse 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
