import { defineConfig } from "vite";
// Builds the self-contained website runtime (one ES module) that every exported site uses.
export default defineConfig({
  build: {
    outDir: "public/site-runtime",
    emptyOutDir: true,
    lib: { entry: "site-runtime/main.ts", formats: ["es"], fileName: () => "viewer.js" },
    rolldownOptions: { output: { codeSplitting: false } },
    target: "es2020",
    minify: process.env.NOMIN ? false : true,
  },
});
