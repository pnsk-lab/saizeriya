import { json, type RequestHandler } from '@sveltejs/kit'

const disabled = () =>
  json(
    { error: 'Cart changes are stored in sessionStorage and submitted only on order confirmation' },
    { status: 410 },
  )

export const POST: RequestHandler = async () => disabled()

export const DELETE: RequestHandler = async () => disabled()
