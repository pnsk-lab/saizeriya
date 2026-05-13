import { json, type RequestHandler } from '@sveltejs/kit'
import { UCP_CHECKOUT_CAPABILITY, UCP_SHOPPING_SERVICE, UCP_VERSION } from '$lib/server/ucp'

export const GET: RequestHandler = async ({ url }) => {
  const origin = url.origin
  return json({
    name: 'betterzeriya',
    url: origin,
    ucp: {
      version: UCP_VERSION,
      services: {
        [UCP_SHOPPING_SERVICE]: [
          {
            version: UCP_VERSION,
            bindings: [
              {
                type: 'rest',
                endpoint: `${origin}/api/ucp`,
              },
            ],
          },
        ],
      },
      capabilities: {
        [UCP_CHECKOUT_CAPABILITY]: [{ version: UCP_VERSION }],
      },
    },
  })
}
