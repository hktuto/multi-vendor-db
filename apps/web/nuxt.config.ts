export default defineNuxtConfig({
  compatibilityDate: '2026-02-14',
  
  devtools: { enabled: true },
  
  modules: [
    '@nuxt/ui'
  ],
  
  css: ['~/assets/css/main.css'],
  
  typescript: {
    strict: true
  },
  
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler'
        }
      }
    }
  }
})