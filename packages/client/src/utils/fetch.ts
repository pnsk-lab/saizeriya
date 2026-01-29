export type FetchSource =  (r: Request) => Promise<Response> | Response
export const createFetch = (
  fetchSource?: FetchSource
): typeof globalThis.fetch => {
  return (fetchSource
    ? async (input, init) => {
        if (input instanceof Request) {
          return await fetchSource(input)
        } else {
          return await fetchSource(new Request(input.toString(), init))
        }
      }
    : globalThis.fetch) as typeof globalThis.fetch
}
