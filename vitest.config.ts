import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const r = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  test: {
    include: ["tests/component/**/*.test.{ts,tsx}", "components/**/*.component.test.{ts,tsx}"],
    environment: "happy-dom",
    setupFiles: [r("./tests/setup-dom.ts")],
    globals: true,
    css: true,
    environmentOptions: {
      happyDOM: {
        url: "http://localhost/",
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    },
  },
  resolve: {
    alias: {
      "@": r("./"),
      "server-only": r("./tests/mocks/server-only.ts"),
    },
  },
})
