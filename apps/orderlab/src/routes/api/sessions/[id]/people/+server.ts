import { json, type RequestHandler } from '@sveltejs/kit'
import {
  parseOfficialSessionSnapshot,
  serializeState,
  setOfficialPeopleCount,
} from '$lib/server/official-client'

export const POST: RequestHandler = async ({ params, request }) => {
  const body = await request.json().catch(() => ({}))
  const peopleCount = Number(body.peopleCount)

  if (!Number.isInteger(peopleCount) || peopleCount < 1 || peopleCount > 99) {
    return json({ error: 'People count must be between 1 and 99' }, { status: 400 })
  }

  try {
    const result = await setOfficialPeopleCount(
      params.id ?? '',
      peopleCount,
      parseOfficialSessionSnapshot(body.officialSession),
    )
    return json({ state: serializeState(result.state), officialSession: result.officialSession })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Failed to set people count' },
      { status: 502 },
    )
  }
}
