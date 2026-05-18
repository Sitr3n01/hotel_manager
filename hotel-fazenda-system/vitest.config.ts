import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "./coverage",
      include: ["app/**", "components/**", "lib/**"],
      exclude: [
        "components/ui/**",
        "**/*.d.ts",
        "**/types.ts",
        "lib/supabase/**",
        "lib/prisma.ts",
        "lib/auth/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "server-only": path.resolve(__dirname, "./tests/server-only-shim.ts"),
    },
  },
});
