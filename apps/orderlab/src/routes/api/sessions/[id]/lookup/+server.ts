import { json, type RequestHandler } from '@sveltejs/kit'
import { lookupOfficialItem, parseOfficialSessionSnapshot } from '$lib/server/official-client'

export const POST: RequestHandler = async ({ params, request }) => {
  const body = await request.json().catch(() => ({}))
  const code = String(body.code ?? '').trim()

  if (!/^\d{4}$/.test(code)) {
    return json({ error: 'Item code must be 4 digits' }, { status: 400 })
  }

  try {
    const result = await lookupOfficialItem(
      params.id ?? '',
      code,
      parseOfficialSessionSnapshot(body.officialSession),
    )
    return json({ ...result.result, officialSession: result.officialSession })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Failed to lookup item' },
      { status: 502 },
    )
  }
}
