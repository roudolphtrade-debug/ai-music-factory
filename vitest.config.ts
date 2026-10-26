import { defineConfig } from "vitest/config";

/**
 * Dedicated test configuration.
 *
 * It deliberately does not load `vite.config.ts` (TanStack Start / Nitro plugins), so that running
 * the tests never regenerates `src/routeTree.gen.ts`. The `@/` alias comes from tsconfig paths.
 * DOM tests opt in per file with a `// @vitest-environment jsdom` docblock.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    // Blocks every request to a real host: tests run on fake providers only (see the file).
    setupFiles: ["src/test/networkGuard.ts"],
  },
});
