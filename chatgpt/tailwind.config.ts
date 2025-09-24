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
        surface: "#f3f4f6",
        "surface-dark": "#202123",
        accent: "#10a37f",
      },
      boxShadow: {
        subtle: "0 2px 12px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
