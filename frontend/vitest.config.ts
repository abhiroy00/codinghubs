import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/studio/**/*.test.tsx", "src/seo/**/*.test.tsx", "src/seo/**/*.test.ts", "src/pages/**/*.test.ts", "src/community/**/*.test.tsx"],
    setupFiles: ["./src/studio/test-setup.ts"],
  },
});
