/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1B7576",
        secondary: "#2E7D55",
      },
      fontFamily: {
        sans: ["Poppins", "Arial", "sans-serif"],
      },
      fontSize: {
        base: "14px" /* NFR-USAB-1: tipografía legible */,
      },
    },
  },
  plugins: [],
};
