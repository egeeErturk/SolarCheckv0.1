import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        energy: {
          50: "#fff8eb",
          100: "#ffedc7",
          400: "#ffad22",
          500: "#f58220",
          600: "#df6b13"
        },
        ink: {
          800: "#182434",
          900: "#0d1624"
        },
        solar: {
          yellow: "#FDB913",
          gold: "#FDB913",
          orange: "#F97316",
          blue: "#003B71"
        },
        result: {
          profit: "#16A34A",
          profitSoft: "#DCFCE7",
          loss: "#2563EB",
          lossSoft: "#DBEAFE",
          energy: "#FDB913",
          navy: "#003B71",
          warning: "#F97316",
          softBlue: "#EAF4FF",
          softYellow: "#FFF7D6"
        }
      },
      boxShadow: {
        soft: "0 18px 45px rgba(10, 31, 68, 0.10)",
        yellow: "0 16px 34px rgba(246, 181, 0, 0.24)"
      }
    }
  },
  plugins: []
};

export default config;
