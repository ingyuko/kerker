import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirrors the `@/*` alias from tsconfig.json.
    alias: { "@": path.resolve(import.meta.dirname, ".") },
  },
  test: {
    // The repo also holds pytest files under tests/; only pick up the TS ones.
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
