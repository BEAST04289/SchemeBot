/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        saffron: {
          DEFAULT: '#FF9933', // Vibrant Saffron Orange
          light: '#FFB870',
          dark: '#E07B16',
        },
        navy: {
          DEFAULT: '#1e293b', // Deep Slate Blue
          light: '#334155',
          dark: '#0f172a',
        },
        tricolorgreen: {
          DEFAULT: '#166534', // Rich Forest Green
          light: '#22c55e',
          dark: '#14532d',
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        hindi: ['var(--font-noto-devanagari)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
