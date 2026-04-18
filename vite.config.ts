import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'admin-redirect',
      configureServer(server) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        server.middlewares.use((req: any, res: any, next: any) => {
          if (req.url === '/admin' || req.url === '/admin/') {
            res.writeHead(302, { Location: '/admin/index.html' })
            res.end()
            return
          }
          next()
        })
      },
    },
  ],
  // root is the workspace root — index.html lives here
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main:       resolve(__dirname, 'index.html'),
        admin:      resolve(__dirname, 'admin/index.html'),
        adminCats:  resolve(__dirname, 'admin/categories.html'),
        adminProds: resolve(__dirname, 'admin/products.html'),
        adminUsers: resolve(__dirname, 'admin/users.html'),
        policies:   resolve(__dirname, 'policies/index.html'),
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
