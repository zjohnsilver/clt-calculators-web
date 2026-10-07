import type { Config } from 'tailwindcss';

/** Light only: the site has one theme, so the colors are plain values, not variables. */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F3EFE6',
        card: '#FBF9F4',
        ink: '#0B0B0D',
        muted: '#5B5B66',
        subtle: '#6B6B76',
        line: '#E0DBCF',
        'line-strong': '#CEC8B9',
        hover: '#ECE8DD',
        raise: '#14704F',
        'raise-soft': '#DDEDE4',
        'raise-strong': '#1F8F66',
        arrears: '#A85F00',
        previous: '#C9C3B5',
        danger: '#C21D33',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      height: { control: '44px', field: '48px', cta: '50px' },
    },
  },
  plugins: [],
};

export default config;
