import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: "#1a3a2a",
          light: "#244d38",
          dark: "#112618",
          50: "#f0f7f3",
          100: "#d9ede2",
          200: "#b3dac6",
          300: "#7ebfa3",
          400: "#4a9e7c",
          500: "#2d7d5e",
          600: "#1a3a2a",
          700: "#162f23",
          800: "#11241a",
          900: "#0c1a13",
        },
        gold: {
          DEFAULT: "#f0c040",
          light: "#f5d06a",
          dark: "#c9a030",
          50: "#fefbe8",
          100: "#fdf5c4",
          200: "#fae97a",
          300: "#f0c040",
          400: "#d9a830",
          500: "#b88620",
        },
      },
    },
  },
  plugins: [],
};

export default config;
