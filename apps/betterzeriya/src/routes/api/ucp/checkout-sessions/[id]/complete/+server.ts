import { json, type RequestHandler } from '@sveltejs/kit'
import { completeUcpCheckoutSession } from '$lib/server/ucp'

export const POST: RequestHandler = async ({ params, request }) => {
  if (!params.id) {
    return json(
      { code: 'invalid_request', content: 'Checkout session id is required' },
      { status: 400 },
    )
  }

  await request.json().catch(() => ({}))
  let session

  try {
    session = await completeUcpCheckoutSession(params.id)
  } catch (error) {
    return json(
      {
        code: 'submit_failed',
        content: error instanceof Error ? error.message : 'Failed to submit order',
      },
      { status: 502 },
    )
  }

  if (!session) {
    return json(
      { code: 'not_found_or_closed', content: 'Checkout session not found or already closed' },
      { status: 404 },
    )
  }

  return json(session)
}
