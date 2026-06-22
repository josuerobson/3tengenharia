import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          // Azul Escuro / Petróleo — cor principal 3T
          primary: '#00475B',
          'primary-dark': '#003344',
          'primary-hover': '#005f78',
          'primary-muted': '#00475B1A', // 10% opacity

          // Laranja — cor de destaque / detalhes
          accent: '#FF8C00',
          'accent-dark': '#e07a00',
          'accent-light': '#ffa040',
          'accent-muted': '#FF8C001A', // 10% opacity
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)',
        'sidebar': '1px 0 0 0 rgb(0 0 0 / 0.06)',
        'header': '0 1px 3px 0 rgb(0 0 0 / 0.15)',
        'dropdown': '0 10px 25px -5px rgb(0 0 0 / 0.12), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-in-left': { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
        'slide-down': { from: { opacity: '0', transform: 'translateY(-6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'fade-in-up': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-in-left': 'slide-in-left 300ms ease-out',
        'slide-down': 'slide-down 150ms ease-out',
        'slide-up': 'slide-up 350ms cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in-up': 'fade-in-up 250ms ease-out',
        'scale-in': 'scale-in 200ms ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config
