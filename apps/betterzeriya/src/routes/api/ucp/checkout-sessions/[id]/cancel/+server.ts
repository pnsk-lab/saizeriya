import { json, type RequestHandler } from '@sveltejs/kit'
import { cancelUcpCheckoutSession } from '$lib/server/ucp'

export const POST: RequestHandler = async ({ params }) => {
  if (!params.id) {
    return json(
      { code: 'invalid_request', content: 'Checkout session id is required' },
      { status: 400 },
    )
  }

  const session = cancelUcpCheckoutSession(params.id)
  if (!session) {
    return json(
      { code: 'not_found_or_closed', content: 'Checkout session not found or already closed' },
      { status: 404 },
    )
  }

  return json(session)
}
