/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#090B10',
        surface: {
          DEFAULT: '#11151D',
          elevated: '#181E29',
          muted: '#0D1117'
        },
        border: {
          DEFAULT: '#293140',
          subtle: '#1C2331',
          accent: 'rgba(88, 213, 255, 0.3)'
        },
        text: {
          primary: '#F5F7FB',
          secondary: '#A6AFBD',
          muted: '#6B7688'
        },
        accent: {
          DEFAULT: '#58D5FF',
          strong: '#28BDF0',
          glow: 'rgba(88, 213, 255, 0.15)',
          dark: '#0A4A63'
        },
        success: '#43C98B',
        warning: '#F3BD59',
        danger: '#F16D7A'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        'glow-sm': '0 0 15px -3px rgba(88, 213, 255, 0.2)',
        'glow-md': '0 0 25px -5px rgba(88, 213, 255, 0.25)',
        'card-dark': '0 10px 30px -10px rgba(0, 0, 0, 0.7)'
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-pattern': 'linear-gradient(to right, rgba(41, 49, 64, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(41, 49, 64, 0.2) 1px, transparent 1px)'
      }
    },
  },
  plugins: [],
}
