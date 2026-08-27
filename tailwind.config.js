/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        green: {
          DEFAULT: '#00C875',
          dark: '#00A35E',
          light: '#E8FAF2',
        },
        navy: {
          DEFAULT: '#0A1628',
          mid: '#132240',
        },
      },
      fontFamily: {
        display: ['Syne', 'system-ui', 'sans-serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 16px rgba(0,0,0,0.06)',
        'card-lg': '0 12px 40px rgba(0,0,0,0.10)',
      },
      borderRadius: {
        xl:  '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};
