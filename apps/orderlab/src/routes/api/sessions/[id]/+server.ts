import { json, type RequestHandler } from '@sveltejs/kit'
import {
  getOfficialState,
  parseOfficialSessionSnapshot,
  serializeState,
} from '$lib/server/official-client'

export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const body = await request.json().catch(() => ({}))
    const result = await getOfficialState(
      params.id ?? '',
      parseOfficialSessionSnapshot(body.officialSession),
    )
    return json({ state: serializeState(result.state), officialSession: result.officialSession })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Session not found' },
      { status: 404 },
    )
  }
}

export const GET: RequestHandler = async ({ params }) => {
  try {
    const result = await getOfficialState(params.id ?? '')
    return json({ state: serializeState(result.state), officialSession: result.officialSession })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Session not found' },
      { status: 404 },
    )
  }
}
