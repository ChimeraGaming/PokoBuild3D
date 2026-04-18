import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  publicDir: 'public',
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) {
            return 'three'
          }

          if (id.includes('node_modules/@supabase')) {
            return 'supabase'
          }

          if (id.includes('node_modules')) {
            return 'vendor'
          }
        }
      }
    }
  }
})
