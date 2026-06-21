/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        stadium: {
          bg: '#0B0F19',
          surface: '#10172A',
          panel: '#141D33',
          border: '#1E2D4A',
        },
        amber: {
          bid: '#F2B705',
          glow: '#F2B70533',
        },
        pitch: {
          green: '#1FAA59',
          glow: '#1FAA5933',
        },
        crimson: {
          hot: '#E2433D',
          glow: '#E2433D33',
        },
        teams: {
          MI: '#004BA0',
          CSK: '#F7D02A',
          RCB: '#EC1C24',
          KKR: '#3A225D',
          SRH: '#F7501C',
          DC: '#00008B',
          PBKS: '#ED1B24',
          RR: '#2D4FA4',
          GT: '#1C1C2E',
          LSG: '#A2DDF3',
        },
      },
      fontFamily: {
        display: ['Barlow Condensed', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-crimson': 'pulse-crimson 0.8s ease-in-out infinite',
        'sold-stamp': 'sold-stamp 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'ticker-slide': 'ticker-slide 0.3s ease-out',
        'bid-flash': 'bid-flash 0.4s ease-out',
      },
      keyframes: {
        'pulse-crimson': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(226,67,61,0)' },
          '50%': { boxShadow: '0 0 20px 8px rgba(226,67,61,0.4)' },
        },
        'sold-stamp': {
          '0%': { transform: 'scale(0.3) rotate(-15deg)', opacity: '0' },
          '100%': { transform: 'scale(1) rotate(-5deg)', opacity: '1' },
        },
        'ticker-slide': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'bid-flash': {
          '0%': { backgroundColor: 'rgba(242,183,5,0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
    },
  },
  plugins: [],
};
