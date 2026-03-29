import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0A0E1A",
          mid: "#1B2A4A",
        },
        brand: {
          red: "#C0392B",
          teal: "#1D9E75",
          blue: "#2E86C1",
        },
        surface: {
          DEFAULT: "#111827",
          2: "#0D1117",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
