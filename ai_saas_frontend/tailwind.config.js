/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}", // Inclui todos os seus componentes
  ],
  theme: {
    extend: {
      colors: {
        primary: "#4f46e5",     // roxo escuro
        secondary: "#14b8a6",   // ciano
        accent: "#f97316",      // laranja
        neutral: "#1e293b",     // cinza escuro
      },
      // Estender tema de foco para acessibilidade
      outline: {
        'focus-ring': '3px solid #185cfc',
      },
    },
  },
  plugins: [],
  corePlugins: {
    // Desabilitar outline padrão do Tailwind para usar custom focus
    outline: false,
  },
}
