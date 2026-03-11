/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        management: '#3B82F6',
        marketing: '#10B981',
        it: '#8B5CF6',
        accounting: '#F59E0B',
      },
    },
  },
  plugins: [],
};
