module.exports = {
  purge: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        'regal-blue': '#243c5a',
        'regal-lblue': '#8a9fbf',
      }
    }
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
