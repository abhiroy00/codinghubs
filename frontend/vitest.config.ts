import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  // vite.config.ts injects the stylesheet hash; tests only need it to exist.
  define: { __CSS_VERSION__: JSON.stringify("test") },
  test: {
    environment: "jsdom",
    include: ["src/studio/**/*.test.tsx", "src/seo/**/*.test.tsx", "src/seo/**/*.test.ts", "src/pages/**/*.test.ts", "src/community/**/*.test.tsx", "src/lib/**/*.test.tsx"],
    setupFiles: ["./src/studio/test-setup.ts"],
  },
});
