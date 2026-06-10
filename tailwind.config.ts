import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
    },
    extend: {
      colors: {
        // Editorial / Scandinavian palette from the brief.
        sand: "#F5F2EB", // background
        paper: "#FFFFFF", // cards
        ink: "#222222", // text
        line: "#DDD8CF", // border
        // Semantic aliases used by shadcn-style components.
        background: "#F5F2EB",
        foreground: "#222222",
        card: "#FFFFFF",
        border: "#DDD8CF",
        muted: "#8C857A",
        accent: "#222222",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: [
          "var(--font-fraunces)",
          "ui-serif",
          "Georgia",
          "Cambria",
          "serif",
        ],
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      letterSpacing: {
        widest: "0.2em",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
