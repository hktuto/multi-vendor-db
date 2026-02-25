import { promises as fs } from "fs";
import { join } from "path";

export default defineNuxtConfig({
  compatibilityDate: "2026-02-14",

  devtools: { enabled: true },
  ssr: false,
  modules: ["@nuxt/ui", "@nuxthub/core", "nuxt-auth-utils"],

  css: ["~/assets/css/main.css"],

  // Register hooks directly in config
  hooks: {
    "build:before": async () => {
      console.log("📦 Copying PostgreSQL migrations to public directory...");

      const rootDir = process.cwd();
      const sourceDir = join(rootDir, "server/db/migrations/postgresql");
      const targetDir = join(rootDir, "public/.data/db/migrations/postgresql");

      try {
        // Ensure target directory exists
        await fs.mkdir(targetDir, { recursive: true });

        // Copy all .sql files
        const files = await fs.readdir(sourceDir);
        let copiedCount = 0;

        for (const file of files) {
          if (file.endsWith(".sql")) {
            const sourcePath = join(sourceDir, file);
            const targetPath = join(targetDir, file);
            await fs.copyFile(sourcePath, targetPath);
            copiedCount++;
          }
        }

        // Copy meta directory
        const metaSourceDir = join(sourceDir, "meta");
        const metaTargetDir = join(targetDir, "meta");

        try {
          await fs.access(metaSourceDir);
          await fs.mkdir(metaTargetDir, { recursive: true });

          const metaFiles = await fs.readdir(metaSourceDir);
          for (const file of metaFiles) {
            const sourcePath = join(metaSourceDir, file);
            const targetPath = join(metaTargetDir, file);
            await fs.copyFile(sourcePath, targetPath);
          }
          console.log(`✅ Copied ${copiedCount} migrations + meta files`);
        } catch {
          console.log("⚠️  No meta directory found");
        }
      } catch (error) {
        console.error("❌ Failed to copy migrations:", error);
      }
    },
  },

  hub: {
    db: "postgresql",
    blob: true,
  },

  runtimeConfig: {
    public: {
      appUrl: process.env.NUXT_PUBLIC_APP_URL || "http://localhost:3000",
      // Electric SQL configuration
      electricUrl: process.env.ELECTRIC_URL || "http://localhost:30000",
    },
  },

  typescript: {
    strict: true,
  },

  nitro: {
    experimental: {
      tasks: true,
      // Enable WASM support for PGlite
      wasm: true,
    },
  },

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          api: "modern-compiler",
        },
      },
    },
    // Electric SQL / PGlite optimizations
    optimizeDeps: {
      include: [],
      exclude: [
        "@electric-sql/pglite",
        "@electric-sql/pglite-sync",
        // PGlite uses dynamic imports for WASM
      ],
    },
  },
});
