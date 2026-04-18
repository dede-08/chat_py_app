import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', 
  theme: {
    extend: {
      colors: {
        slate: {
          ...colors.slate,
          700: '#313338', // discord main
          800: '#2b2d31', // discord sidebar
          900: '#1e1f22', // discord dark
        },
        blue: {
          ...colors.blue,
          400: '#5c6bc0', // light navy
          500: '#3949ab', 
          600: '#1a237e', // navy
        },
        indigo: {
          ...colors.indigo,
          400: '#5c6bc0',
          500: '#283593',
          600: '#1a237e', 
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
