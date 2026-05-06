import type { PageLoad } from './$types'

export const ssr = false
export const prerender = false

export const load: PageLoad = ({ params }) => ({
  sessionId: params.id,
})
