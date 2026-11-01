/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#020617',
        base: '#0F172A',
        panel: '#111B33',
        edge: '#1E2B4A',
        brand: { DEFAULT: '#7C8CFF', soft: '#A5B4FC', deep: '#5B63F0' },
        ok: '#34D399',
        warn: '#FBBF24',
        bad: '#F87171'
      },
      fontFamily: {
        display: ['"Chakra Petch"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'Consolas', 'monospace']
      }
    }
  },
  plugins: []
};
