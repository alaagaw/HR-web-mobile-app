import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          dark: '#1D4ED8',
          light: 'var(--color-primary-light)',
        },
        secondary: '#1E293B',
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        border: 'var(--color-border)',
        success: {
          DEFAULT: '#16A34A',
          light: 'var(--color-success-light)',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: 'var(--color-warning-light)',
        },
        error: {
          DEFAULT: '#DC2626',
          light: 'var(--color-error-light)',
        },
        info: {
          DEFAULT: '#0EA5E9',
          light: 'var(--color-info-light)',
        },
        'text-primary': 'var(--color-text-primary)',
        'text-muted': 'var(--color-text-muted)',
        'text-light': 'var(--color-text-light)',
      },
    },
  },
  plugins: [],
};

export default config;
