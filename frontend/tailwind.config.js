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
        theme: {
          bg: '#000000',
          surface: '#050505',
          surface2: '#080808',
          surface3: '#0B0B0B',
          card: '#0E1528',
          border: '#1E2D4A',
        },
        accent: {
          blue: '#0066FF',
          hover: '#3B82F6',
          glow: 'rgba(0,102,255,0.25)',
        },
        status: {
          success: '#22C55E',
          warning: '#F59E0B',
          danger: '#EF4444',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B8C0D4',
          muted: '#6B7280',
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
        'fade-in': 'fadeIn 0.2s ease-in',
        'slide-up': 'slideUp 0.25s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
