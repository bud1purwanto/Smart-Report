/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sap: {
          blue: '#003366',
          dark: '#0f172a',
          accent: '#0070ba',
          light: '#f1f5f9',
          gold: '#f59e0b',
          border: '#e2e8f0',
        }
      },
      fontFamily: {
        mono: ['"DM Mono"', 'monospace'],
        sans: ['"Segoe UI"', 'Manrope', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

