import { json, type RequestHandler } from '@sveltejs/kit'
import { parseOfficialSessionSnapshot, showOfficialReceipt } from '$lib/server/official-client'

export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const body = await request.json().catch(() => ({}))
    return json(
      await showOfficialReceipt(
        params.id ?? '',
        parseOfficialSessionSnapshot(body.officialSession),
      ),
    )
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Failed to show receipt' },
      { status: 502 },
    )
  }
}
