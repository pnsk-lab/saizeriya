import type { PageLoad } from './$types'

export const load: PageLoad = ({ params }) => ({
  sessionId: params.id,
})
