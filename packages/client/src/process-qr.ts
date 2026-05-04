import { PageParser } from './utils/page-parser'

export const processQR = async (qrURL: string, fetch: typeof globalThis.fetch) => {
  const sourceURL = new URL(qrURL)

  const qrResponse = await fetch(sourceURL.toString(), {
    redirect: 'manual',
  })

  const firstLocation = qrResponse.headers.get('location')
  const nextLocation = firstLocation ? new URL(firstLocation, sourceURL) : sourceURL

  const html = firstLocation
    ? await fetch(nextLocation.toString()).then((r) => r.text())
    : await qrResponse.text()

  const parser = new PageParser(html)

  return {
    id: parser.getNextActionId(),
    baseURL: `${nextLocation.origin}${nextLocation.pathname}`,
    shopId: parser.getShopId(),
    tableNo: parser.getTableNo(),
    peopleCount: parser.getPeopleCount(),
    pageKind: parser.getPageKind(),
  }
}