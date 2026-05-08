import { json, type RequestHandler } from '@sveltejs/kit'
import { createUcpCheckoutSession } from '$lib/server/ucp'

export const POST: RequestHandler = async ({ request, url }) => {
  const body = await request.json().catch(() => null)
  const lineItems = body?.line_items

  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return json({ error: 'line_items is required' }, { status: 400 })
  }

  const session = createUcpCheckoutSession({
    line_items: lineItems,
    buyer: body?.buyer,
    currency: body?.currency,
  })

  return json(
    {
      checkout_session: session,
      checkout_url: `${url.origin}/sessions/${session.id}`,
      status_url: `${url.origin}/api/ucp/checkout-sessions/${session.id}`,
    },
    { status: 201 },
  )
}
