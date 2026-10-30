import { defineConfig } from "vitest/config";

export default defineConfig({
  // what build.mjs puts in for the card's version
  define: { __VERSION__: JSON.stringify("test") },
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**"],
      thresholds: { lines: 95, branches: 90, functions: 95, statements: 95 },
    },
  },
});
