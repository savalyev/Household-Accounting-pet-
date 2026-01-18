import { defineConfig } from 'vite';

export default defineConfig({
  root: '.', 
  build: {
    outDir: 'dist'
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});