import { defineConfig } from "vite";
import topLevelAwait from "vite-plugin-top-level-await";

const isGithubPages = process.env.GITHUB_PAGES === 'true';
export default defineConfig({
  plugins: [topLevelAwait()],
  build: { target: 'es2022' },
  base: isGithubPages ? "/constraint-canvas/" : "/",

  // Vite bundles external dependencies by default in development mode, but that
  // process does not include assets; this option disables that particular kind
  // of bundling for Rose so that it can use its internal WebAssembly module
  optimizeDeps: { exclude: ["rose"] },
});