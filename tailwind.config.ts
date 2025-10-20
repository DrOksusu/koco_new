/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'koco-primary': '#2563eb',
        'koco-secondary': '#1e40af',
        'koco-accent': '#3b82f6',
      },
      fontFamily: {
        sans: ['Pretendard', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config