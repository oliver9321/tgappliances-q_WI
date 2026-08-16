import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Provide a default VITE_API_URL so catalog.js and admin modules resolve
    // to predictable paths when running under vitest.
    env: {
      VITE_API_URL: '/api/v1',
    },
  },
})
