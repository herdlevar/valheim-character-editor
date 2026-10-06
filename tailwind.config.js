/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        valheim: {
          bg: '#111315',
          dark: '#181b1f',
          panel: '#20242a',
          slot: '#121417',
          slothover: '#2a313b',
          border: '#453a2b',
          gold: '#e6c364',
          goldlight: '#ffea9f',
          brass: '#b8944d',
          wood: '#2b2118',
          wooddark: '#1c150f',
          red: '#c0392b',
          green: '#27ae60',
          blue: '#2980b9',
          stamina: '#eed638',
          health: '#d63031',
          eitr: '#9b59b6',
        }
      },
      fontFamily: {
        valheim: ['Trajan Pro', 'Cinzel', 'Georgia', 'serif'],
        sans: ['Segoe UI', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        valheim: '0 8px 30px rgba(0, 0, 0, 0.8), inset 0 0 15px rgba(0, 0, 0, 0.5)',
        slot: 'inset 0 0 8px rgba(0, 0, 0, 0.8)',
        glow: '0 0 15px rgba(230, 195, 100, 0.4)',
      }
    },
  },
  plugins: [],
}
