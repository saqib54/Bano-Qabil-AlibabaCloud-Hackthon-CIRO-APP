/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./screens/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: '#0A0E1A',
        surface: '#141927',
        card: '#1C2333',
        border: '#252D3D',
        primary: '#FF4444',
        secondary: '#FF8C00',
        success: '#00D084',
        info: '#4A9EFF',
        text: '#FFFFFF',
        textMuted: '#8892A4',
        critical: '#FF2D55',
        high: '#FF9500',
        medium: '#FFCC00',
        low: '#34C759'
      }
    },
  },
  plugins: [],
}
