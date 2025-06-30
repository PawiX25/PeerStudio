/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-dark': '#252525',
        'bg-medium': '#343434',
        'bg-light': '#4a4a4a',
        'text-primary': '#dcdcdc',
        'text-secondary': '#888888',
        'accent': '#00f0c2',
        'accent-hover': '#00c7a1',
      },
      gridTemplateColumns: {
        '16': 'repeat(16, minmax(0, 1fr))',
      },
    },
  },
  plugins: [],
} 