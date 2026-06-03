/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        af: {
          green:  { DEFAULT: '#1B5E20', light: '#2E7D32', pale: '#E8F5E9' },
          gold:   { DEFAULT: '#F9A825', light: '#FDD835', pale: '#FFFDE7' },
          dark:   '#0D1B0F',
          gray:   '#F5F5F5',
        }
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] }
    }
  },
  plugins: []
}
