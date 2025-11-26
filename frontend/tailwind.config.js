/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        matrix: {
          // Primary colors
          green: '#00FF41',
          cyan: '#00F0FF',
          purple: '#B026FF',
          pink: '#FF2E97',
          // Dark theme colors
          bg: '#0A0E14',
          surface: '#131820',
          elevated: '#1A1F2E',
          border: '#2A3142',
          // Text colors
          primary: '#FFFFFF',
          secondary: '#A0AEC0',
          muted: '#64748B',
          // Semantic colors
          success: '#00FF41',
          warning: '#FFB800',
          error: '#FF2E63',
          info: '#00F0FF'
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display': ['3.75rem', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'h1': ['3rem', { lineHeight: '1.1', fontWeight: '700' }],
        'h2': ['2.25rem', { lineHeight: '1.2', fontWeight: '600' }],
        'h3': ['1.875rem', { lineHeight: '1.3', fontWeight: '600' }],
        'h4': ['1.5rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body-large': ['1.125rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body': ['1rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body-small': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1.5', fontWeight: '500' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 255, 65, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 255, 65, 0.8)' },
        }
      },
      boxShadow: {
        'matrix': '0 0 20px rgba(0, 255, 65, 0.2)',
        'matrix-strong': '0 0 30px rgba(0, 255, 65, 0.4)',
        'matrix-green': '0 0 20px rgba(0, 255, 65, 0.5)',
        'matrix-purple': '0 0 20px rgba(179, 38, 255, 0.5)',
        'matrix-cyan': '0 0 20px rgba(0, 240, 255, 0.5)',
      }
    },
  },
  plugins: [],
}
