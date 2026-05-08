import { json, type RequestHandler } from '@sveltejs/kit'

export const GET: RequestHandler = async ({ url }) => {
  const origin = url.origin
  return json({
    name: 'betterzeriya',
    version: '2026-01-11',
    capabilities: [
      {
        name: 'dev.ucp.shopping.checkout',
        bindings: [
          {
            type: 'rest',
            spec: 'https://ucp.dev/specification/checkout-rest/',
            base_url: `${origin}/api/ucp`,
          },
        ],
      },
    ],
  })
}
