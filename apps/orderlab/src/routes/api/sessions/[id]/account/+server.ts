import { json, type RequestHandler } from '@sveltejs/kit'
import { getOfficialAccount, parseOfficialSessionSnapshot } from '$lib/server/official-client'

export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const body = await request.json().catch(() => ({}))
    return json(
      await getOfficialAccount(params.id ?? '', parseOfficialSessionSnapshot(body.officialSession)),
    )
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Failed to load account' },
      { status: 502 },
    )
  }
}
