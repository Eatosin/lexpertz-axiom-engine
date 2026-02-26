import type { Config } from "tailwindcss";

const config: Config = {
  content:[
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
        
        // NEW: Added for the Landing Page cards (Linear-style elevated black)
        surface: "#111111", 
        
        brand: {
          primary: "#10b981", // Emerald 500
          secondary: "#0ea5e9", // Sky 500
          accent: "#065f46", // Dark Emerald for subtle glows
          teal: "#22D3EE", // NEW: SOTA Teal for high-contrast landing page buttons
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
        // Your original gradients
        "brand-gradient": "linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)",
        "brand-glow": "radial-gradient(circle at center, rgba(16, 185, 129, 0.1) 0%, transparent 70%)",
        
        // NEW: Landing Page Hero Gradients & Grids
        "glow-gradient": "radial-gradient(circle at 50% 0%, rgba(14, 165, 233, 0.15), transparent 50%)",
        "grid-pattern": "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
      },
      // NEW: Landing Page Animations
      animation: {
        "fade-in-up": "fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/container-queries"),
  ],
};
export default config;
