/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        neonGreen: "#00FF88",
        darkSurface: "#1e1e1e",
        darkSurfaceLighter: "#2a2a2a",
        darkBackground: "#121212",
      },
      fontFamily: {
        inter: ["Inter_400Regular", "sans-serif"],
        interMedium: ["Inter_500Medium", "sans-serif"],
        interSemibold: ["Inter_600SemiBold", "sans-serif"],
        interBold: ["Inter_700Bold", "sans-serif"],
      },
    },
  },
  plugins: [],
}
