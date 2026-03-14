// tailwind.config.ts
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
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        // Raw color names
        "coffee-bean": "#7f5539",
        "camel": "#a68a64",
        "almond-cream": "#ede0d4",
        "dusty-olive": "#656d4a",
        "ebony": "#414833",

        // Primary (coffee-bean)
        primary: {
          50: "#f4e9e0",
          100: "#e9d3c1",
          200: "#d4a78a",
          300: "#bf7b53",
          400: "#a55f3b",
          500: "#7f5539",
          600: "#6b4730",
          700: "#573a27",
          800: "#432c1e",
          900: "#2f1f15",
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },

        // Secondary (camel)
        secondary: {
          50: "#f7f0e6",
          100: "#efe1d0",
          200: "#dfc3a1",
          300: "#cfa572",
          400: "#bf8752",
          500: "#a68a64",
          600: "#8b7352",
          700: "#705c41",
          800: "#554530",
          900: "#3a2e20",
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },

        // Accent (almond-cream)
        accent: {
          50: "#fefcf9",
          100: "#fdf9f3",
          200: "#fbf3e7",
          300: "#f9ecdb",
          400: "#f3e1cf",
          500: "#ede0d4",
          600: "#d6c5b6",
          700: "#afa192",
          800: "#887d6e",
          900: "#61594a",
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },

        // Success (dusty-olive)
        success: {
          50: "#eef0e8",
          100: "#dde1d1",
          200: "#bbc3a3",
          300: "#99a575",
          400: "#7d8a58",
          500: "#656d4a",
          600: "#535a3e",
          700: "#414732",
          800: "#2f3426",
          900: "#1d211a",
          DEFAULT: "#656d4a",
        },

        // Danger (warm red)
        danger: {
          50: "#f9eeea",
          100: "#f3ddd6",
          200: "#e7bbac",
          300: "#db9983",
          400: "#cf7759",
          500: "#b35e4c",
          600: "#8f4b3d",
          700: "#6b382e",
          800: "#47261f",
          900: "#23130f",
          DEFAULT: "#b35e4c",
        },

        // Neutral (warm gray)
        neutral: {
          50: "#faf9f7",
          100: "#f3f1ed",
          200: "#e6e1d9",
          300: "#d6cfc4",
          400: "#b8b1a2",
          500: "#9a9384",
          600: "#7b7365",
          700: "#5e574c",
          800: "#453f38",
          900: "#2d2925",
        },

        // Info / Warn
        info: {
          50: "#f7f0e6",
          100: "#efe1d0",
          200: "#dfc3a1",
          300: "#cfa572",
          400: "#bf8752",
          500: "#a68a64",
          600: "#8b7352",
          700: "#705c41",
          800: "#554530",
          900: "#3a2e20",
        },
        warn: {
          50: "#f4e9e0",
          100: "#e9d3c1",
          200: "#d4a78a",
          300: "#bf7b53",
          400: "#a55f3b",
          500: "#7f5539",
          600: "#6b4730",
          700: "#573a27",
          800: "#432c1e",
          900: "#2f1f15",
        },

        // shadcn CSS variable references
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;