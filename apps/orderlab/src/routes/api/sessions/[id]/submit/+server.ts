import { json, type RequestHandler } from '@sveltejs/kit'
import {
  parseOfficialSessionSnapshot,
  serializeState,
  submitOfficialCart,
} from '$lib/server/official-client'
import { dryRunEnabled } from '$lib/server/safety';

export const POST: RequestHandler = async ({ params, request }) => {
  const body = await request.json().catch(() => ({}))
  const cart = Array.isArray(body.cart) ? body.cart : []

  if (cart.length === 0) {
    return json({ error: 'Cart is empty' }, { status: 400 })
  }

  const normalizedCart = []
  for (const item of cart) {
    const id = String(item.id ?? '').trim()
    const count = Number(item.count ?? 1)
    if (!/^\d{4}$/.test(id)) {
      return json({ error: 'Item code must be 4 digits' }, { status: 400 })
    }
    if (!Number.isInteger(count) || count < 1 || count > 99) {
      return json({ error: 'Count must be between 1 and 99' }, { status: 400 })
    }
    normalizedCart.push({ id, count })
  }

  if (dryRunEnabled) {
    return json({
      dryRun: true,
      message: 'Order submission is disabled in sandbox mode.',
      cart: normalizedCart
    });
  }

  try {
    const result = await submitOfficialCart(
      params.id ?? '',
      normalizedCart,
      parseOfficialSessionSnapshot(body.officialSession),
    )
    return json({ state: serializeState(result.state), officialSession: result.officialSession })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Failed to submit order' },
      { status: 502 },
    )
  }
}
