import { json, type RequestHandler } from '@sveltejs/kit'
import { createUcpCheckoutSessionWithOfficialSession, type UcpLineItemInput } from '$lib/server/ucp'
import { parseOfficialSessionSnapshot } from '$lib/server/official-client'

const MAX_LINE_ITEMS = 100
const MAX_ITEM_ID_LENGTH = 256
const MAX_QUANTITY = 1000

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const normalizeBuyer = (value: unknown) => (isRecord(value) ? value : undefined)
const normalizeCurrency = (value: unknown) =>
  typeof value === 'string' && /^[A-Z]{3}$/.test(value) ? value : undefined
const normalizePeopleCount = (value: unknown) => {
  const peopleCount = Number(value)
  return Number.isInteger(peopleCount) && peopleCount >= 1 && peopleCount <= 99
    ? peopleCount
    : undefined
}

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
    if (!/^\d{4}$/.test(id) || id.length > MAX_ITEM_ID_LENGTH) {
      return {
        error: 'Each line_items item id must be a 4 digit Saizeriya item code',
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

  const qrURLSource = String(body.qrURLSource ?? body.qr_url_source ?? '').trim()
  const officialSession = parseOfficialSessionSnapshot(
    body.officialSession ?? body.official_session,
  )

  if (!qrURLSource && !officialSession) {
    return json(
      {
        code: 'invalid_request',
        content: 'qrURLSource or officialSession is required to create an orderable checkout',
      },
      { status: 400 },
    )
  }

  if (qrURLSource && !URL.canParse(qrURLSource)) {
    return json({ code: 'invalid_request', content: 'QR URL is invalid' }, { status: 400 })
  }

  let session

  try {
    session = await createUcpCheckoutSessionWithOfficialSession({
      origin: url.origin,
      line_items: normalizedLineItems.lineItems,
      buyer: normalizeBuyer(body.buyer),
      currency: normalizeCurrency(body.currency),
      qrURLSource,
      peopleCount: normalizePeopleCount(body.peopleCount ?? body.people_count),
      officialSession,
    })
  } catch (error) {
    return json(
      {
        code: 'official_session_failed',
        content: error instanceof Error ? error.message : 'Failed to initialize official session',
      },
      { status: 502 },
    )
  }

  return json(session, { status: 201 })
}
