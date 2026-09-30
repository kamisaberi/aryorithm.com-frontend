import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./data/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#07090E",
        panel: "#0D111A",
        hairline: "#1A2232",
        cyan: { DEFAULT: "#00E5FF" },
        kernel: "#00FFA3",
        threat: "#FF3366",
        telemetry: "#FFB800",
        ink: "#F0F4F8",
        muted: "#8A99AD",
      },
      fontFamily: {
        display: ['"Space Grotesk"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: { md: "4px" },
    },
  },
  plugins: [],
};

export default config;
