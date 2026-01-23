/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#4f46e5",
        secondary: "#14b8a6",
        accent: "#f97316",
        neutral: "#1e293b",
      },
    },
  },
  plugins: [],
};