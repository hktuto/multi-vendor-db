export default defineNuxtConfig({
  compatibilityDate: "2026-02-14",

  devtools: { enabled: true },
  ssr:false,
  modules: ["@nuxt/ui", "@nuxthub/core", "nuxt-auth-utils", "~/modules/pglite-migrations"],

  css: ["~/assets/css/main.css"],

  hub: {
    db: "postgresql",
    blob: true,
  },

  runtimeConfig: {
    public: {
      appUrl: process.env.NUXT_PUBLIC_APP_URL || "http://localhost:3000",
      // Electric SQL configuration
      electricUrl:
        process.env.ELECTRIC_URL || "http://localhost:30000",
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
        // PGlite uses dynamic imports for WASM
      ],
    },
  },
});
