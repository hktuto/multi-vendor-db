export default defineNuxtConfig({
  compatibilityDate: "2026-02-14",

  devtools: { enabled: true },

  modules: ["@nuxt/ui", "@nuxthub/core", "nuxt-auth-utils"],

  css: ["~/assets/css/main.css"],

  hub: {
    db: "postgresql",
    blob: true,
  },

  typescript: {
    strict: true,
  },
  nitro: {
    experimental: {
      tasks: true,
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
  },
});
