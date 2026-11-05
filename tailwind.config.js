/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard', 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', 'sans-serif'],
      },
      keyframes: {
        'warning-flash': {
          '0%, 100%': { backgroundColor: 'rgba(239, 68, 68, 0)', boxShadow: 'inset 0 0 0 rgba(239, 68, 68, 0)' },
          '50%': { backgroundColor: 'rgba(239, 68, 68, 0.35)', boxShadow: 'inset 0 0 80px rgba(239, 68, 68, 0.7)' },
        },
      },
      animation: {
        'warning-flash': 'warning-flash 0.6s ease-in-out 5 forwards',
      },
    },
  },
  plugins: [],
};
