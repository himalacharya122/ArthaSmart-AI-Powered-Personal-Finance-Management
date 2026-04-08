/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#E8F0F5',
          100: '#D1E1EB',
          200: '#A3C3D7',
          300: '#75A5C3',
          400: '#4787AF',
          500: '#1F6F8B',
          600: '#1A5276',
          700: '#154360',
          800: '#103550',
          900: '#0D2B3E',
          950: '#091D2A',
        },
        accent: {
          50: '#EEFBF2',
          100: '#D4F5DE',
          200: '#A9EBBD',
          300: '#7DD89A',
          400: '#60CE80',
          500: '#4DB86A',
          600: '#3A9E55',
          700: '#2D7B42',
          800: '#1F5830',
          900: '#12351D',
        },
        surface: '#F0F0F0',
        card: '#FFFFFF',
        danger: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          400: '#F87171',
          500: '#E74C3C',
          600: '#DC2626',
          700: '#B91C1C',
        },
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          400: '#FBBF24',
          500: '#F39C12',
          600: '#D97706',
          700: '#B45309',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
