/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        tahoma: ['Tahoma', 'Tajawal', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
