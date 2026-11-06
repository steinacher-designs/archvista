import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { cpSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));

/** Serve /assets-lib from the repository in dev and copy it into the app bundle on build. */
function assetLibrary(): Plugin {
  return {
    name: "archvista-asset-library",
    configureServer(server) {
      server.middlewares.use("/assets-lib", (req, res, next) => {
        const f = path.join("assets-lib", decodeURIComponent((req.url ?? "").split("?")[0]));
        if (!existsSync(f) || f.includes("..")) return next();
        res.end(readFileSync(f));
      });
    },
    closeBundle() { cpSync("assets-lib", "dist/assets-lib", { recursive: true }); },
  };
}

export default defineConfig({
  plugins: [react(), assetLibrary()],
  clearScreen: false,
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: { port: 1420, strictPort: true },
  worker: { format: "es" },
  build: { target: "es2022", outDir: "dist", chunkSizeWarningLimit: 4000 },
});
