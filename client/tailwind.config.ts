import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        brand: {
          // NEW: Emerald/Teal to Blue Spectrum
          primary: "#10b981", // Emerald 500
          secondary: "#0ea5e9", // Sky 500
          accent: "#065f46", // Dark Emerald for subtle glows
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "#10b981",
          "primary-foreground": "#ffffff",
          accent: "#1e1e24",
          border: "hsl(var(--sidebar-border))",
        },
      },
      backgroundImage: {
        // The new Green-to-Blue "Enterprise" Gradient
        "brand-gradient": "linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)",
        "brand-glow": "radial-gradient(circle at center, rgba(16, 185, 129, 0.1) 0%, transparent 70%)",
      },
    },
  },
  plugins: [],
};
export default config;
