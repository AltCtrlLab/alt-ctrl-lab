import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './providers/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        headline: ['var(--font-manrope)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
      },
      colors: {
        'surface': '#0e0e10',
        'surface-container': '#19191c',
        'surface-container-high': '#1f1f22',
        'surface-container-highest': '#262528',
        'surface-container-low': '#131315',
        'surface-bright': '#2c2c2f',
        'on-surface': '#f9f5f8',
        'on-surface-variant': '#adaaad',
        'on-background': '#f9f5f8',
        'outline-variant': '#48474a',
      },
    },
  },
  plugins: [],
};

export default config;
