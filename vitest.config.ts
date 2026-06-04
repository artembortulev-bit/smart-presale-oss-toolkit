import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
});
