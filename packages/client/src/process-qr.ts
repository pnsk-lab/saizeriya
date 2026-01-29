import { PageParser } from './utils/page-parser'

export const processQR = async (
  qrURL: string,
  fetch: typeof globalThis.fetch,
) => {
  const qrResponse = await fetch(qrURL, {
    redirect: 'manual',
  })
  const firstLocation = qrResponse.headers.get('location')
  if (!firstLocation) {
    throw new Error('No redirect location found')
  }
  const nextLocation = new URL(firstLocation, qrURL)

  const parser = new PageParser(
    await fetch(nextLocation.toString()).then((r) => r.text()),
  )

  return {
    id: parser.getNextActionId(),
    baseURL: `${nextLocation.origin}${nextLocation.pathname}`,
    shopId: parser.getShopId(),
    tableNo: parser.getTableNo(),
  }
}
