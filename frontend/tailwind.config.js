/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:   { DEFAULT: '#1e40af', light: '#3b82f6', dark: '#1e3a8a' },
        medical:   { DEFAULT: '#0f172a', surface: '#f8fafc' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
