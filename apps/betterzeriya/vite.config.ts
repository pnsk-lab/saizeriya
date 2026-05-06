import tailwindcss from '@tailwindcss/vite'
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig(({ mode }) => ({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    allowedHosts: true,
  },
  resolve:
    mode === 'production'
      ? {
          alias: {
            '$server-mock/menu.json': resolve('./src/lib/server-mock-stub.json'),
          },
        }
      : {},
}))
