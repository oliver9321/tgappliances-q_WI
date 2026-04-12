import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main:       'index.html',
        admin:      'admin.html',
        adminCats:  'admin-categories.html',
        adminProds: 'admin-products.html',
        adminUsers: 'admin-users.html',
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
