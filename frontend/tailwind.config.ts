import type { Config } from 'tailwindcss';

// Paleta do protótipo (Canva): roxo escuro, dourado, marfim e lilás.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        roxo: { 50: '#F7F3FC', 100: '#EDE5F7', 300: '#B79BE0', 500: '#7A4FB8', 700: '#4A2C7A', 900: '#2A1650' },
        ouro: { 100: '#F8EFCB', 300: '#E6CB6E', 500: '#C9A227', 700: '#8A6A12' },
        marfim: '#FBF8F3',
        tinta: { 900: '#1F1A2B', 600: '#5E566E', 300: '#D9D2E3', 100: '#F1EDF6' },
        ok: '#2E7D5B',
        erro: '#C0392B',
      },
      fontFamily: { sans: ['var(--font-inter)', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 2px 12px rgba(42,22,80,0.08)' },
    },
  },
  plugins: [],
};
export default config;
