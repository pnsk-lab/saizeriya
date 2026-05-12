import { json, type RequestHandler } from '@sveltejs/kit'
import { completeUcpCheckoutSession } from '$lib/server/ucp'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const POST: RequestHandler = async ({ params, request }) => {
  if (!params.id) {
    return json(
      { code: 'invalid_request', content: 'Checkout session id is required' },
      { status: 400 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const payment = isRecord(body) && isRecord(body.payment) ? body.payment : undefined
  const session = completeUcpCheckoutSession(params.id, payment)

  if (!session) {
    return json(
      { code: 'not_found_or_closed', content: 'Checkout session not found or already closed' },
      { status: 404 },
    )
  }

  return json(session)
}
