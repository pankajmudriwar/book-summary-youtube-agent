import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#09090B",
        card: "#111114",
        "card-elevated": "#18181D",
        "card-hover": "#1F1F27",
        border: "rgba(255, 255, 255, 0.08)",
        "border-strong": "rgba(255, 255, 255, 0.16)",
        primary: {
          DEFAULT: "#6366F1",
          hover: "#4F46E5",
          light: "#818CF8",
        },
        success: {
          DEFAULT: "#10B981",
          hover: "#059669",
          light: "#34D399",
        },
        warning: {
          DEFAULT: "#F59E0B",
          hover: "#D97706",
          light: "#FBBF24",
        },
        danger: {
          DEFAULT: "#F43F5E",
          hover: "#E11D48",
          light: "#FB7185",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      animation: {
        "pulse-subtle": "pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow-pulse": "glow 2s ease-in-out infinite alternate",
        "fade-in": "fadeIn 0.2s ease-in-out forwards",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 15px rgba(99, 102, 241, 0.3)" },
          "100%": { boxShadow: "0 0 30px rgba(99, 102, 241, 0.6)" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
