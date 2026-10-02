/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // رنگ‌های لوح سنتی کشیک
        zone: {
          one: '#2f7a4d',
          five: '#1d6fa5',
          seven: '#c2622b',
        },
        ink: '#1f2430',
        muted: '#6b7280',
        rest: '#e8eef5',
        late: '#f59e0b',
        danger: '#dc2626',
        ok: '#16a34a',
        paper: '#f7f7f9',
      },
      fontFamily: {
        sans: ['Vazirmatn'],
      },
    },
  },
  plugins: [],
};
