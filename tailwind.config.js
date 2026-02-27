/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'cursive'],
        mono: ['Consolas', 'Monaco', 'monospace'],
      },
      colors: {
        // AI Life Layer theme
        app: {
          bg: '#0a0a0f',
          sidebar: '#111118',
          main: '#0d0d14',
          border: '#1a1a24',
          card: '#12121a',
        },
        accent: {
          blue: '#3b82f6',
          cyan: '#06b6d4',
          purple: '#8b5cf6',
          pink: '#ec4899',
          red: '#ef4444',
          green: '#22c55e',
          yellow: '#eab308',
        },
        text: {
          primary: '#ffffff',
          secondary: '#a0a0b0',
          muted: '#606070',
        },
        message: {
          user: '#2d1f2f',
          ai: '#1a1a24',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px currentColor' },
          '100%': { boxShadow: '0 0 20px currentColor' },
        }
      }
    },
  },
  plugins: [],
}
