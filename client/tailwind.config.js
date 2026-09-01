/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#F8FAFC',
        ink: {
          DEFAULT: '#0F172A',
          soft: '#64748B'
        },
        line: '#E2E8F0',
        navy: {
          DEFAULT: '#0A1E42',
          deep: '#071531',
          soft: '#12305E',
          glow: '#1D4ED8'
        },
        peri: {
          DEFAULT: '#D7E3F8',
          soft: '#E7EFFB',
          dark: '#B9CDEF'
        },
        aqua: {
          DEFAULT: '#4CC9F0',
          dark: '#22A7DD'
        },
        brand: {
          DEFAULT: '#2563EB',
          dark: '#1D4ED8',
          soft: '#EFF6FF'
        },
        danger: {
          DEFAULT: '#E11D48',
          soft: '#FFF1F2'
        },
        safe: {
          DEFAULT: '#10B981',
          soft: '#ECFDF5'
        },
        warn: {
          DEFAULT: '#F59E0B',
          soft: '#FFFBEB'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.06)',
        lift: '0 10px 25px -5px rgb(15 23 42 / 0.08), 0 8px 10px -6px rgb(15 23 42 / 0.05)',
        'glow-brand': '0 0 24px rgb(37 99 235 / 0.35), 0 0 60px rgb(37 99 235 / 0.15)',
        'glow-danger': '0 0 24px rgb(225 29 72 / 0.35), 0 0 60px rgb(225 29 72 / 0.15)',
        'glow-safe': '0 0 24px rgb(16 185 129 / 0.35), 0 0 60px rgb(16 185 129 / 0.15)'
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }
    }
  },
  plugins: []
};
