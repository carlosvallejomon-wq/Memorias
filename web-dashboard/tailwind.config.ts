import type { Config } from 'tailwindcss';

// Paleta cálida (ámbar, crema, blanco roto) pensada para evocar nostalgia y
// el look de una Polaroid, según la dirección de diseño del spec (sección 7).
export default {
  darkMode: 'media',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#faf3e8',
        amber: {
          50: '#fdf6ec',
          100: '#faebd0',
          400: '#e3a94c',
          500: '#d38f2e',
          600: '#b3711f',
        },
        ink: '#2b2320',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
