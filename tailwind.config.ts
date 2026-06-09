import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        pitch: "#0b6e4f", // 球场绿
      },
    },
  },
  plugins: [],
} satisfies Config;
