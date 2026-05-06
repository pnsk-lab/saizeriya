import {
  createClient,
  type AccountSummary,
  type ClientState,
  type LookupItemResult,
} from 'saizeriya.js'
import { env } from '$env/dynamic/private'

type OfficialClient = Awaited<ReturnType<typeof createClient>>
type BrowserOfficialClient = Awaited<
  ReturnType<typeof import('saizeriya.js/browser-mode').createBrowserClient>
>
type AnyOfficialClient = OfficialClient | BrowserOfficialClient
type FetchSource = (request: Request) => Promise<Response> | Response
type CookieEntry = [string, string]

export interface CheckoutPresentation {
  state: ReturnType<typeof serializeState>
  account: AccountSummary
  barcodeValue: string
  barcodeImageSrc?: string
  receiptShown: boolean
}

export interface PendingCartItem {
  id: string
  count: number
}

export interface OfficialSessionSnapshot {
  id: string
  state: ClientState
  cookies: CookieEntry[]
  mode?: 'fetch' | 'browser'
  createdAt: number
  updatedAt: number
}

interface SessionRecord {
  client: AnyOfficialClient
  getCookies: () => CookieEntry[]
  mode: 'fetch' | 'browser'
  close?: () => Promise<void>
  createdAt: number
  updatedAt: number
}

const sessions = new Map<string, SessionRecord>()
const sessionTtlMs = 1000 * 60 * 60 * 6
const useBrowserMode = () => env.BROWSER === '1'
const browserLaunchOptions = () =>
  env.CHROME_EXECUTABLE ? { executablePath: env.CHROME_EXECUTABLE } : undefined

const pruneSessions = () => {
  const now = Date.now()
  for (const [id, session] of sessions) {
    if (now - session.updatedAt > sessionTtlMs) {
      void session.close?.()
      sessions.delete(id)
    }
  }
}

const cookieHeader = (cookies: Map<string, string>) =>
  [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ')

const storeSetCookie = (cookies: Map<string, string>, response: Response) => {
  const setCookie = response.headers.get('set-cookie')
  if (!setCookie) {
    return
  }

  for (const cookie of setCookie.split(/,(?=\s*[^;,\s]+=)/)) {
    const [pair] = cookie.split(';')
    const separator = pair.indexOf('=')
    if (separator > 0) {
      cookies.set(pair.slice(0, separator).trim(), pair.slice(separator + 1).trim())
    }
  }
}

const createCookieFetch = (initialCookies: CookieEntry[] = []) => {
  const cookies = new Map<string, string>(initialCookies)

  const fetchSource: FetchSource = async (request) => {
    const headers = new Headers(request.headers)
    const currentCookies = cookieHeader(cookies)
    if (currentCookies) {
      headers.set('cookie', currentCookies)
    }

    const response = await fetch(new Request(request, { headers }))
    storeSetCookie(cookies, response)
    return response
  }

  return {
    fetchSource,
    getCookies: () => [...cookies.entries()] as CookieEntry[],
  }
}

const touch = (id: string, session: SessionRecord) => {
  session.updatedAt = Date.now()
  sessions.set(id, session)
  return session
}

export const createOfficialSession = async (qrURLSource: string) => {
  pruneSessions()
  const id = crypto.randomUUID()
  const now = Date.now()

  if (useBrowserMode()) {
    const { createBrowserClient } = await import('saizeriya.js/browser-mode')
    const client = await createBrowserClient({
      qrURLSource,
      launchOptions: browserLaunchOptions(),
    })
    const session: SessionRecord = {
      client,
      getCookies: () => [],
      mode: 'browser',
      close: () => client.close(),
      createdAt: now,
      updatedAt: now,
    }
    sessions.set(id, session)
    return {
      id,
      state: client.getState(),
      officialSession: createSnapshot(id, client, [], now, 'browser'),
    }
  }

  const cookieFetch = createCookieFetch()
  const client = await createClient({
    qrURLSource,
    fetchSource: cookieFetch.fetchSource,
  })
  const session: SessionRecord = {
    client,
    getCookies: cookieFetch.getCookies,
    mode: 'fetch',
    createdAt: now,
    updatedAt: now,
  }
  sessions.set(id, session)
  return {
    id,
    state: client.getState(),
    officialSession: createSnapshot(id, client, cookieFetch.getCookies(), now, 'fetch'),
  }
}

export const getOfficialSession = (id: string) => {
  pruneSessions()
  const session = sessions.get(id)
  if (!session) {
    throw new Error('Session not found')
  }
  return touch(id, session)
}

const createSnapshot = (
  id: string,
  client: AnyOfficialClient,
  cookies: CookieEntry[],
  createdAt = Date.now(),
  mode: 'fetch' | 'browser' = 'fetch',
): OfficialSessionSnapshot => ({
  id,
  state: client.getState(),
  cookies,
  mode,
  createdAt,
  updatedAt: Date.now(),
})

export const parseOfficialSessionSnapshot = (
  value: unknown,
): OfficialSessionSnapshot | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  const snapshot = value as OfficialSessionSnapshot
  if (!snapshot.id || !snapshot.state?.baseURL || !Array.isArray(snapshot.cookies)) {
    return undefined
  }
  return snapshot
}

const createClientFromSnapshot = async (id: string, snapshot?: OfficialSessionSnapshot) => {
  if (useBrowserMode()) {
    const session = getOfficialSession(id)
    if (session.mode !== 'browser') {
      throw new Error('Browser session not found')
    }
    return {
      client: session.client,
      getSnapshot: () => createSnapshot(id, session.client, [], session.createdAt, 'browser'),
    }
  }

  if (snapshot?.id === id) {
    const cookieFetch = createCookieFetch(snapshot.cookies)
    const client = await createClient({
      initialState: snapshot.state,
      fetchSource: cookieFetch.fetchSource,
    })
    return {
      client,
      getSnapshot: () =>
        createSnapshot(id, client, cookieFetch.getCookies(), snapshot.createdAt, 'fetch'),
    }
  }

  const session = getOfficialSession(id)
  return {
    client: session.client,
    getSnapshot: () =>
      createSnapshot(id, session.client, session.getCookies(), session.createdAt, session.mode),
  }
}

export const setOfficialPeopleCount = async (
  id: string,
  peopleCount: number,
  snapshot?: OfficialSessionSnapshot,
) => {
  const session = await createClientFromSnapshot(id, snapshot)
  const state = await session.client.setPeopleCount(peopleCount)
  return { state, officialSession: session.getSnapshot() }
}

export const serializeState = (state: ClientState) => ({
  ...state,
  baseURL: undefined,
})

export const lookupOfficialItem = async (
  id: string,
  code: string,
  snapshot?: OfficialSessionSnapshot,
): Promise<{ result: LookupItemResult; officialSession: OfficialSessionSnapshot }> => {
  const session = await createClientFromSnapshot(id, snapshot)
  const result = await session.client.lookupItem(code)
  return { result, officialSession: session.getSnapshot() }
}

export const submitOfficialCart = async (
  id: string,
  cart: PendingCartItem[],
  snapshot?: OfficialSessionSnapshot,
) => {
  const session = await createClientFromSnapshot(id, snapshot)
  while (session.client.getState().cart.length > 0) {
    await session.client.removeCartItem(0)
  }
  for (const item of cart) {
    await session.client.addItem(item.id, { count: item.count })
  }
  const state = await session.client.submitOrder()
  return { state, officialSession: session.getSnapshot() }
}

const createCheckoutCode = (state: ClientState, account: AccountSummary) =>
  [
    'SZ',
    state.shopId.toString().padStart(4, '0'),
    state.tableNo.toString().padStart(3, '0'),
    account.controlNo ?? state.sessionId ?? state.nextId,
  ].join('-')

export const getOfficialAccount = async (
  id: string,
  snapshot?: OfficialSessionSnapshot,
): Promise<CheckoutPresentation & { officialSession: OfficialSessionSnapshot }> => {
  const session = await createClientFromSnapshot(id, snapshot)
  const result = await session.client.getAccount()
  return {
    state: serializeState(result.state),
    account: result.account,
    barcodeValue: createCheckoutCode(result.state, result.account),
    receiptShown: false,
    officialSession: session.getSnapshot(),
  }
}

export const showOfficialReceipt = async (
  id: string,
  snapshot?: OfficialSessionSnapshot,
): Promise<CheckoutPresentation & { officialSession: OfficialSessionSnapshot }> => {
  const session = await createClientFromSnapshot(id, snapshot)
  const accountResult = await session.client.getAccount()
  const receiptResult = await session.client.getReceipt()
  return {
    state: serializeState(receiptResult.state),
    account: accountResult.account,
    barcodeValue:
      receiptResult.receipt.barcodeValue ??
      createCheckoutCode(receiptResult.state, accountResult.account),
    barcodeImageSrc: receiptResult.receipt.barcodeImageSrc,
    receiptShown: true,
    officialSession: session.getSnapshot(),
  }
}

export const callOfficialStaff = async (
  id: string,
  after: boolean,
  snapshot?: OfficialSessionSnapshot,
) => {
  const session = await createClientFromSnapshot(id, snapshot)
  const result = after ? await session.client.callDessert() : await session.client.callStaff()
  return { result, officialSession: session.getSnapshot() }
}

export const getOfficialState = async (id: string, snapshot?: OfficialSessionSnapshot) => {
  const session = await createClientFromSnapshot(id, snapshot)
  return { state: session.client.getState(), officialSession: session.getSnapshot() }
}
