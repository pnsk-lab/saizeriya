export const createQueueLocker = () => {
  let lastPromise: Promise<void> = Promise.resolve()
  
  return async <T>(fn: () => Promise<T>): Promise<T> => {
    const resultPromise = lastPromise.then(() => fn())
    lastPromise = resultPromise.then(() => {}, () => {})
    return resultPromise
  }
}
