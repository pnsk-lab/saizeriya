import { json, type RequestHandler } from '@sveltejs/kit'
import { getUcpCheckoutSession, updateUcpCheckoutSession } from '$lib/server/ucp'
import { _normalizeLineItems } from '../+server'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const normalizeBuyer = (value: unknown) => (isRecord(value) ? value : undefined)
const normalizePayment = (value: unknown) => (isRecord(value) ? value : undefined)
const normalizeCurrency = (value: unknown) =>
  typeof value === 'string' && /^[A-Z]{3}$/.test(value) ? value : undefined

export const GET: RequestHandler = async ({ params }) => {
  if (!params.id) {
    return json(
      { code: 'invalid_request', content: 'Checkout session id is required' },
      { status: 400 },
    )
  }

  const session = getUcpCheckoutSession(params.id)
  if (!session) {
    return json({ code: 'not_found', content: 'Checkout session not found' }, { status: 404 })
  }
  return json(session)
}

export const PUT: RequestHandler = async ({ params, request }) => {
  if (!params.id) {
    return json(
      { code: 'invalid_request', content: 'Checkout session id is required' },
      { status: 400 },
    )
  }

  const body = await request.json().catch(() => null)
  if (!isRecord(body)) {
    return json({ code: 'invalid_request', content: 'Invalid request body' }, { status: 400 })
  }

  const normalizedLineItems =
    body.line_items === undefined ? undefined : _normalizeLineItems(body.line_items)
  if (normalizedLineItems && 'error' in normalizedLineItems) {
    return json({ code: 'invalid_request', content: normalizedLineItems.error }, { status: 400 })
  }

  const session = updateUcpCheckoutSession(params.id, {
    line_items: normalizedLineItems?.lineItems,
    buyer: normalizeBuyer(body.buyer),
    currency: normalizeCurrency(body.currency),
    payment: normalizePayment(body.payment),
  })

  if (!session) {
    return json(
      { code: 'not_found_or_closed', content: 'Checkout session not found or already closed' },
      { status: 404 },
    )
  }

  return json(session)
}
