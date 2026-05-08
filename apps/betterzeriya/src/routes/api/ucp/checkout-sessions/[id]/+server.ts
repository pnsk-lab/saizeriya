import { json, type RequestHandler } from '@sveltejs/kit'
import { completeUcpCheckoutSession, getUcpCheckoutSession } from '$lib/server/ucp'

export const GET: RequestHandler = async ({ params }) => {
  const session = getUcpCheckoutSession(params.id)
  if (!session) {
    return json({ error: 'Checkout session not found' }, { status: 404 })
  }
  return json({ checkout_session: session })
}

export const POST: RequestHandler = async ({ params }) => {
  const session = completeUcpCheckoutSession(params.id)
  if (!session) {
    return json({ error: 'Checkout session not found' }, { status: 404 })
  }
  return json({ checkout_session: session })
}
