/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          300: '#66f0a0',
          400: '#33eb91',
          500: '#00E676',
          600: '#00c966',
          700: '#00a854',
        },
        accent: {
          300: '#ffe866',
          400: '#ffe033',
          500: '#FFD700',
          600: '#e6c200',
          700: '#ccad00',
        },
        dark: {
          500: '#2a3544',
          600: '#1e2a36',
          700: '#1a2430',
          800: '#121A22',
          900: '#0A0F14',
          950: '#060a0e',
        },
        silver: {
          400: '#c0c0c0',
          500: '#a8a8a8',
        },
        bronze: {
          400: '#cd7f32',
          500: '#b87333',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-live': 'pulseLive 1.5s ease-in-out infinite',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'glow': 'glow 2s ease-in-out infinite',
        'glow-border': 'glowBorder 3s ease-in-out infinite',
        'ticker': 'ticker 25s linear infinite',
        'bounce-soft': 'bounceSoft 1s ease infinite',
        'shimmer': 'shimmer 1.5s infinite',
        'float': 'float 6s ease-in-out infinite',
        'particle': 'particle 4s ease-in-out infinite',
        'score-pop': 'scorePop 0.5s ease-out',
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
          '0%, 100%': { boxShadow: '0 0 12px rgba(0, 230, 118, 0.35)' },
          '50%': { boxShadow: '0 0 28px rgba(255, 215, 0, 0.45)' },
        },
        glowBorder: {
          '0%, 100%': { borderColor: 'rgba(0, 230, 118, 0.3)', boxShadow: '0 0 20px rgba(0, 230, 118, 0.15)' },
          '50%': { borderColor: 'rgba(255, 215, 0, 0.5)', boxShadow: '0 0 30px rgba(255, 215, 0, 0.2)' },
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
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        particle: {
          '0%, 100%': { opacity: '0.2', transform: 'translateY(0) scale(1)' },
          '50%': { opacity: '0.8', transform: 'translateY(-12px) scale(1.2)' },
        },
        pulseLive: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        scorePop: {
          '0%': { transform: 'scale(1.4)', opacity: '0' },
          '60%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'stadium': 'linear-gradient(180deg, rgba(0,230,118,0.08) 0%, #0A0F14 45%, #060a0e 100%)',
        'glass': 'linear-gradient(135deg, rgba(18,26,34,0.85) 0%, rgba(10,15,20,0.75) 100%)',
      },
      boxShadow: {
        'neon': '0 0 20px rgba(0, 230, 118, 0.25)',
        'neon-lg': '0 0 40px rgba(0, 230, 118, 0.35)',
        'gold': '0 0 20px rgba(255, 215, 0, 0.3)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
};
