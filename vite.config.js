import { defineConfig } from "vite";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  // the plugin described above
  plugins: [topLevelAwait()],
  build: { target: 'es2022' },

  // Vite bundles external dependencies by default in development mode, but that
  // process does not include assets; this option disables that particular kind
  // of bundling for Rose so that it can use its internal WebAssembly module
  optimizeDeps: { exclude: ["rose"] },
});