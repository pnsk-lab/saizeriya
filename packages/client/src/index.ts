export interface SaizeriyaClientOptions {
  qrURL: string
  fetch?: typeof fetch
}

export interface SaizeriyaFormSnapshot {
  action: string
  fields: Record<string, string>
}

export interface SaizeriyaPage {
  url: string
  html: string
  form: SaizeriyaFormSnapshot
}

interface FormElementHandle {
  getAttribute(name: string): string | null
  querySelectorAll(selector: string): FormElementHandle[]
  matches(selector: string): boolean
}

interface DocumentHandle {
  querySelector(selector: string): FormElementHandle | null
}

type DOMParserConstructor = new () => {
  parseFromString(html: string, contentType: string): DocumentHandle
}

const getDomParser = (): DOMParserConstructor | null => {
  const maybeParser = (globalThis as unknown as { DOMParser?: DOMParserConstructor })
    .DOMParser
  return maybeParser ?? null
}

const parseFormFromHtml = (html: string, baseUrl: string): SaizeriyaFormSnapshot => {
  const parser = getDomParser()
  if (!parser) {
    throw new Error('DOMParser is not available in this environment.')
  }

  const document = new parser().parseFromString(html, 'text/html')
  const form =
    document.querySelector('#frm_ctrl') ?? document.querySelector('form')

  if (!form) {
    throw new Error('Unable to locate form element in response HTML.')
  }

  const actionAttribute = form.getAttribute('action') ?? ''
  const actionUrl = new URL(actionAttribute || '.', baseUrl).toString()
  const fields: Record<string, string> = {}

  const elements = form.querySelectorAll('input, select, textarea')
  for (const element of elements) {
    const name = element.getAttribute('name')
    if (!name) {
      continue
    }

    if (element.matches('input')) {
      const type = element.getAttribute('type')?.toLowerCase() ?? 'text'
      if ((type === 'checkbox' || type === 'radio') && !element.matches(':checked')) {
        continue
      }
    }

    const value = (element as unknown as { value?: string }).value
    fields[name] = value ?? element.getAttribute('value') ?? ''
  }

  return {
    action: actionUrl,
    fields,
  }
}

const createSequentialExecutor = () => {
  let chain = Promise.resolve()
  return async <T>(fn: () => Promise<T>): Promise<T> => {
    const result = chain.then(fn)
    chain = result.catch(() => undefined)
    return result
  }
}

export const createSaizeriyaClient = (options: SaizeriyaClientOptions) => {
  const fetcher = options.fetch ?? fetch
  let latestForm: SaizeriyaFormSnapshot | null = null
  let latestUrl = options.qrURL
  const runSequentially = createSequentialExecutor()

  const hydrateFromHtml = (html: string, responseUrl: string): SaizeriyaPage => {
    const form = parseFormFromHtml(html, responseUrl)
    latestForm = form
    latestUrl = responseUrl
    return {
      url: responseUrl,
      html,
      form,
    }
  }

  const requestHtml = async (
    url: string,
    init?: RequestInit,
  ): Promise<SaizeriyaPage> => {
    const response = await fetcher(url, init)
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}.`)
    }
    const html = await response.text()
    return hydrateFromHtml(html, response.url)
  }

  const ensureInitialized = async () => {
    if (latestForm) {
      return
    }
    await requestHtml(options.qrURL)
  }

  const postForm = async (
    overrides: Record<string, string> = {},
  ): Promise<SaizeriyaPage> => {
    await ensureInitialized()
    if (!latestForm) {
      throw new Error('Client is not initialized.')
    }
    const body = new URLSearchParams({
      ...latestForm.fields,
      ...overrides,
    })

    return requestHtml(latestForm.action, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body,
    })
  }

  const navigateWithProc = async (proc: string) =>
    runSequentially(() => postForm({ proc }))

  return {
    getCurrentForm: () => latestForm,
    getCurrentUrl: () => latestUrl,
    refresh: () => runSequentially(() => requestHtml(options.qrURL)),
    post: (fields: Record<string, string>) =>
      runSequentially(() => postForm(fields)),
    pages: {
      top: () => navigateWithProc('top'),
      number: () => navigateWithProc('number'),
      main: () => navigateWithProc('main'),
      menu: () => navigateWithProc('menu'),
      history: () => navigateWithProc('history'),
      call: () => navigateWithProc('call'),
      account: () => navigateWithProc('account'),
    },
  }
}
