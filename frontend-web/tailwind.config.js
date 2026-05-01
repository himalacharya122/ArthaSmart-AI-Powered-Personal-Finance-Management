/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'background-start': '#0a0e1a',
        'background-end': '#151b2e',
        'surface': '#1a1f35',
        'surface-hover': '#1f243a',
        'primary-text': '#ffffff',
        'primary-secondary': '#8b92ab',
        'accent-green': '#00d4aa',
        'accent-red': '#ff4757',
        'accent-gold': '#ffd93d',
        'border': '#2d3349',
        'border-glow': 'rgba(0, 212, 170, 0.4)',
        'chart-income': '#00d4aa',
        'chart-expense': '#ff4757',
        'chart-grid': '#2d3349',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"DM Sans"', 'sans-serif'],
      },
      boxShadow: {
        'glow-green': '0 0 15px rgba(0, 212, 170, 0.3)',
        'glow-red': '0 0 15px rgba(255, 71, 87, 0.3)',
        'inner-glow': 'inset 0 1px 1px rgba(255, 255, 255, 0.05)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'crypto-gradient': 'linear-gradient(135deg, #0a0e1a 0%, #151b2e 100%)',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        }
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
      }
    },
  },
  plugins: [],
}
