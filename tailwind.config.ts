import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        graphite: {
          950: "#0E0F11",
          900: "#15171A",
          800: "#1A1C1F",
          700: "#212327",
          600: "#2A2D32",
          500: "#3A3E45",
          400: "#5B6069",
          300: "#8A8F98",
          200: "#B4B8BF",
          100: "#DDE0E4"
        },
        accent: {
          DEFAULT: "var(--brand-accent, #3B82F6)",
          foreground: "var(--brand-accent-foreground, #0E0F11)"
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"]
      },
      borderRadius: {
        xl: "0.875rem"
      }
    }
  },
  plugins: []
};
export default config;

