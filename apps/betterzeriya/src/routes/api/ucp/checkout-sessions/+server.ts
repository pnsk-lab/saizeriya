import { json, type RequestHandler } from '@sveltejs/kit'
import { createUcpCheckoutSession } from '$lib/server/ucp'

const MAX_LINE_ITEMS = 100
const MAX_ITEM_ID_LENGTH = 256
const MAX_QUANTITY = 1000

type NormalizedLineItem = {
  id: string
  quantity: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const normalizeLineItems = (
  value: unknown,
): { lineItems: NormalizedLineItem[] } | { error: string } => {
  if (!Array.isArray(value) || value.length === 0) {
    return { error: 'line_items is required' }
  }

  if (value.length > MAX_LINE_ITEMS) {
    return { error: `line_items must contain at most ${MAX_LINE_ITEMS} items` }
  }

  const lineItems: NormalizedLineItem[] = []

  for (const item of value) {
    if (!isRecord(item)) {
      return { error: 'Each line_items entry must be an object' }
    }

    const id = typeof item.id === 'string' ? item.id.trim() : ''
    if (id.length === 0 || id.length > MAX_ITEM_ID_LENGTH) {
      return {
        error: `Each line_items entry must include a non-empty id up to ${MAX_ITEM_ID_LENGTH} characters`,
      }
    }

    const rawQuantity = item.quantity
    const quantity =
      typeof rawQuantity === 'number'
        ? rawQuantity
        : typeof rawQuantity === 'string' && rawQuantity.trim() !== ''
          ? Number(rawQuantity)
          : NaN

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QUANTITY
    ) {
      return {
        error: `Each line_items entry must include a quantity between 1 and ${MAX_QUANTITY}`,
      }
    }

    lineItems.push({ id, quantity })
  }

  return { lineItems }
}

export const POST: RequestHandler = async ({ request, url }) => {
  const body = await request.json().catch(() => null)

  if (!isRecord(body)) {
    return json({ error: 'Invalid request body' }, { status: 400 })
  }

  const normalizedLineItems = normalizeLineItems(body.line_items)
  if ('error' in normalizedLineItems) {
    return json({ error: normalizedLineItems.error }, { status: 400 })
  }

  const session = createUcpCheckoutSession({
    line_items: normalizedLineItems.lineItems,
    buyer: body.buyer,
    currency: body.currency,
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
