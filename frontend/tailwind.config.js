/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#161616',
          soft: '#262220',
          faint: '#4a433f',
        },
        magenta: {
          DEFAULT: '#FF004E',
          deep: '#B4003A',
          soft: '#FF3D74',
        },
        gold: {
          DEFAULT: '#E8B923',
          deep: '#B88E12',
        },
        yellow: {
          DEFAULT: '#FFD527',
          soft: '#FFE580',
        },
        cream: '#FBF3E6',
      },
      fontFamily: {
        sans: ['"Sora"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        grain: "url('/textures/grain.svg')",
      },
      screens: {
        xs: '420px',
      },
    },
  },
  plugins: [],
}
