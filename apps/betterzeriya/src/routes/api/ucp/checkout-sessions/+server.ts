import { json, type RequestHandler } from '@sveltejs/kit'
import { createUcpCheckoutSession, type UcpLineItemInput } from '$lib/server/ucp'

const MAX_LINE_ITEMS = 100
const MAX_ITEM_ID_LENGTH = 256
const MAX_QUANTITY = 1000

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const normalizeBuyer = (value: unknown) => (isRecord(value) ? value : undefined)
const normalizePayment = (value: unknown) => (isRecord(value) ? value : undefined)
const normalizeCurrency = (value: unknown) =>
  typeof value === 'string' && /^[A-Z]{3}$/.test(value) ? value : undefined

export const _normalizeLineItems = (
  value: unknown,
): { lineItems: UcpLineItemInput[] } | { error: string } => {
  if (!Array.isArray(value) || value.length === 0) {
    return { error: 'line_items is required' }
  }

  if (value.length > MAX_LINE_ITEMS) {
    return { error: `line_items must contain at most ${MAX_LINE_ITEMS} items` }
  }

  const lineItems: UcpLineItemInput[] = []

  for (const lineItem of value) {
    if (!isRecord(lineItem) || !isRecord(lineItem.item)) {
      return { error: 'Each line_items entry must include an item object' }
    }

    const id = typeof lineItem.item.id === 'string' ? lineItem.item.id.trim() : ''
    if (id.length === 0 || id.length > MAX_ITEM_ID_LENGTH) {
      return {
        error: `Each line_items item must include a non-empty id up to ${MAX_ITEM_ID_LENGTH} characters`,
      }
    }

    const rawQuantity = lineItem.quantity
    const quantity =
      typeof rawQuantity === 'number'
        ? rawQuantity
        : typeof rawQuantity === 'string' && rawQuantity.trim() !== ''
          ? Number(rawQuantity)
          : NaN

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return {
        error: `Each line_items entry must include a quantity between 1 and ${MAX_QUANTITY}`,
      }
    }

    const title = typeof lineItem.item.title === 'string' ? lineItem.item.title.trim() : undefined
    const price = typeof lineItem.item.price === 'number' ? lineItem.item.price : undefined

    lineItems.push({
      item: {
        id,
        ...(title ? { title } : {}),
        ...(price !== undefined ? { price } : {}),
      },
      quantity,
    })
  }

  return { lineItems }
}

export const POST: RequestHandler = async ({ request, url }) => {
  const body = await request.json().catch(() => null)

  if (!isRecord(body)) {
    return json({ code: 'invalid_request', content: 'Invalid request body' }, { status: 400 })
  }

  const normalizedLineItems = _normalizeLineItems(body.line_items)
  if ('error' in normalizedLineItems) {
    return json({ code: 'invalid_request', content: normalizedLineItems.error }, { status: 400 })
  }

  const session = createUcpCheckoutSession({
    origin: url.origin,
    line_items: normalizedLineItems.lineItems,
    buyer: normalizeBuyer(body.buyer),
    currency: normalizeCurrency(body.currency),
    payment: normalizePayment(body.payment),
  })

  return json(session, { status: 201 })
}
