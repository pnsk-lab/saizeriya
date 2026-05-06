import node from '@sveltejs/adapter-node'
import cloudflare from '@sveltejs/adapter-cloudflare'
import vercel from '@sveltejs/adapter-vercel'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

const adapter = process.env.CLOUDFLARE ? cloudflare() : process.env.VERCEL ? vercel() : node()

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  compilerOptions: {
    // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
    runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true),
  },
  kit: {
    adapter,
    alias: {
      '$server-mock': '../../packages/server/src/data',
    },
  },
}

export default config
