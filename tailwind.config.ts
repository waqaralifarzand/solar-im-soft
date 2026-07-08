import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        card: "var(--card)",
        border: "var(--border)",
        foreground: "var(--foreground)",
        "muted-foreground": "var(--muted-foreground)",
        accent: "var(--accent)",
        destructive: "var(--destructive)",
        success: "var(--success)",
        warning: "var(--warning)",
      },
      borderRadius: {
        card: "20px",
        input: "12px",
        pill: "9999px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
      spacing: {
        "row-dense": "44px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
