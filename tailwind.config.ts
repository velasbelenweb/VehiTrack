import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          DEFAULT: "#8AA84B", // verde oliva del hero/botones
          dark: "#6F8F3B", // franja superior de envío gratis
          light: "#B4CE7C", // fondo header / footer claro
        },
        ink: "#1B2A4A", // azul marino de titulares y texto
        cream: "#F2F1EC", // fondo secciones claras
      },
      fontFamily: {
        // Pila de fuentes de sistema con look redondeado, sin depender de
        // Google Fonts en build time. Si luego quieres las fuentes exactas
        // del sitio original (Quicksand/Poppins), puedes volver a
        // next/font/google o auto-hospedar los .woff2 en /public/fonts.
        display: [
          "Trebuchet MS",
          "Verdana",
          "-apple-system",
          "system-ui",
          "sans-serif",
        ],
        body: [
          "-apple-system",
          "Segoe UI",
          "system-ui",
          "Verdana",
          "sans-serif",
        ],
      },
      borderRadius: {
        pill: "999px",
      },
      keyframes: {
        kenburns: {
          "0%": { transform: "scale(1.12)" },
          "100%": { transform: "scale(1)" },
        },
        "letterbox-in": {
          "0%": { transform: "scaleY(0)" },
          "100%": { transform: "scaleY(1)" },
        },
      },
      animation: {
        kenburns: "kenburns 9s ease-out forwards",
        "letterbox-in": "letterbox-in 900ms cubic-bezier(0.76,0,0.24,1) forwards",
      },
    },
  },
  plugins: [],
};
export default config;
