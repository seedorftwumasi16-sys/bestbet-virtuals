/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        accent: {
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
        },
        dark: {
          500: '#4b5563',
          600: '#374151',
          700: '#1a2332',
          800: '#111827',
          900: '#0a0f1a',
          950: '#060912',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'glow': 'glow 2s ease-in-out infinite',
        'ticker': 'ticker 25s linear infinite',
        'bounce-soft': 'bounceSoft 1s ease infinite',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(34, 197, 94, 0.4)' },
          '50%': { boxShadow: '0 0 20px rgba(234, 179, 8, 0.6)' },
        },
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'stadium': 'linear-gradient(180deg, #0a1628 0%, #0a0f1a 100%)',
      },
    },
  },
  plugins: [],
};
