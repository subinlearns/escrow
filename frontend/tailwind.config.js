/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ember: {
          50: "#fff1f1",
          100: "#ffdede",
          500: "#ef233c",
          600: "#d90429",
          700: "#a80f22",
          900: "#3f0710",
        },
        ink: "#060608",
      },
      boxShadow: {
        redline: "0 18px 60px rgba(217, 4, 41, 0.18)",
      },
    },
  },
  plugins: [],
};
