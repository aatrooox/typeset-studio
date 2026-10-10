/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        vercel: {
          bg: "#000000",
          card: "#0a0a0a",
          cardHover: "#121212",
          border: "#262626",
          borderSubtle: "#1a1a1a",
          text: "#ededed",
          muted: "#888888",
          accent: "#0070f3",
          success: "#00e676",
          warning: "#f5a623",
          danger: "#ee0000",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "sans-serif",
        ],
        mono: [
          "GeistMono",
          "JetBrains Mono",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
