import menuData from '$lib/assets/data/menu.json'
import {
  createOfficialSession,
  lookupOfficialItem,
  setOfficialPeopleCount,
  submitOfficialCart,
  type OfficialSessionSnapshot,
} from '$lib/server/official-client'

export const UCP_VERSION = '2026-04-08'
export const UCP_SHOPPING_SERVICE = 'dev.ucp.shopping'
export const UCP_CHECKOUT_CAPABILITY = 'dev.ucp.shopping.checkout'

type UcpCheckoutStatus =
  | 'incomplete'
  | 'requires_escalation'
  | 'ready_for_complete'
  | 'complete_in_progress'
  | 'completed'
  | 'canceled'

type UcpBuyer = Record<string, unknown>

export interface UcpLineItemInput {
  item: {
    id: string
    title?: string
    price?: number
  }
  quantity: number
}

interface CreateCheckoutSessionInput {
  origin: string
  line_items: UcpLineItemInput[]
  buyer?: UcpBuyer
  currency?: string
  qrURLSource?: string
  peopleCount?: number
  officialSession?: OfficialSessionSnapshot
}

interface UpdateCheckoutSessionInput {
  line_items?: UcpLineItemInput[]
  buyer?: UcpBuyer
  currency?: string
}

interface UcpTotal {
  type: 'subtotal' | 'tax' | 'total'
  amount: number
}

interface UcpCheckoutSession {
  ucp: ReturnType<typeof createUcpMetadata>
  id: string
  status: UcpCheckoutStatus
  currency: string
  buyer?: UcpBuyer
  line_items: Array<UcpLineItemInput & { id: string; totals: UcpTotal[] }>
  totals: UcpTotal[]
  links: Array<{ type: 'terms_of_service' | 'privacy_policy'; url: string }>
  official_session?: {
    id: string
    people_count?: number
  }
  messages?: Array<Record<string, unknown>>
  continue_url?: string
  order?: {
    id: string
    checkout_id: string
    permalink_url: string
  }
  created_at: string
  updated_at: string
  expires_at: string
}

type MenuEntry = {
  code: string
  name: string
  price: number
}

const menuByCode = new Map((menuData as MenuEntry[]).map((item) => [item.code, item]))
const sessions = new Map<string, UcpCheckoutSession>()
const officialSessions = new Map<string, OfficialSessionSnapshot>()
const sessionTtlMs = 1000 * 60 * 60 * 6

export const createUcpMetadata = () => ({
  version: UCP_VERSION,
  capabilities: {
    [UCP_CHECKOUT_CAPABILITY]: [{ version: UCP_VERSION }],
  },
})

const pruneSessions = () => {
  const now = Date.now()
  for (const [id, session] of sessions) {
    if (Date.parse(session.updated_at) + sessionTtlMs < now) {
      sessions.delete(id)
      officialSessions.delete(id)
    }
  }
}

const buildLinks = (origin: string): UcpCheckoutSession['links'] => [
  { type: 'terms_of_service', url: origin },
  { type: 'privacy_policy', url: origin },
]

const resolveLineItem = (lineItem: UcpLineItemInput, index: number) => {
  const menuItem = menuByCode.get(lineItem.item.id)
  const price = lineItem.item.price ?? menuItem?.price ?? 0
  const title = lineItem.item.title ?? menuItem?.name ?? lineItem.item.id
  const amount = price * lineItem.quantity

  return {
    id: `li_${index + 1}`,
    item: {
      ...lineItem.item,
      title,
      price,
    },
    quantity: lineItem.quantity,
    totals: [
      { type: 'subtotal' as const, amount },
      { type: 'total' as const, amount },
    ],
  }
}

const calculateTotals = (lineItems: UcpCheckoutSession['line_items']) => {
  const subtotal = lineItems.reduce((sum, item) => sum + item.totals[0].amount, 0)
  return [
    { type: 'subtotal' as const, amount: subtotal },
    { type: 'tax' as const, amount: 0 },
    { type: 'total' as const, amount: subtotal },
  ]
}

const refreshSessionShape = (
  session: UcpCheckoutSession,
  input: UpdateCheckoutSessionInput & { origin?: string },
) => {
  const lineItems =
    input.line_items?.map(resolveLineItem) ??
    session.line_items.map(({ item, quantity }) => ({ item, quantity })).map(resolveLineItem)
  const now = new Date().toISOString()

  return {
    ...session,
    currency: input.currency ?? session.currency,
    buyer: input.buyer ?? session.buyer,
    line_items: lineItems,
    totals: calculateTotals(lineItems),
    links: input.origin ? buildLinks(input.origin) : session.links,
    updated_at: now,
  }
}

export const createUcpCheckoutSession = (input: CreateCheckoutSessionInput) => {
  pruneSessions()
  const now = new Date()
  const id = `chk_${crypto.randomUUID()}`
  const lineItems = input.line_items.map(resolveLineItem)
  const session: UcpCheckoutSession = {
    ucp: createUcpMetadata(),
    id,
    status: 'ready_for_complete',
    currency: input.currency ?? 'JPY',
    buyer: input.buyer,
    line_items: lineItems,
    totals: calculateTotals(lineItems),
    links: buildLinks(input.origin),
    continue_url: `${input.origin}/`,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    expires_at: new Date(now.getTime() + sessionTtlMs).toISOString(),
  }
  sessions.set(session.id, session)
  return session
}

export const getUcpCheckoutSession = (id: string) => {
  pruneSessions()
  return sessions.get(id)
}

export const updateUcpCheckoutSession = (id: string, input: UpdateCheckoutSessionInput) => {
  const session = getUcpCheckoutSession(id)
  if (!session || session.status === 'completed' || session.status === 'canceled') {
    return undefined
  }
  const updated = refreshSessionShape(session, input)
  sessions.set(id, updated)
  return updated
}

const createOfficialBinding = async (
  checkoutId: string,
  input: Pick<CreateCheckoutSessionInput, 'qrURLSource' | 'peopleCount' | 'officialSession'>,
) => {
  if (input.officialSession) {
    officialSessions.set(checkoutId, input.officialSession)
    return {
      id: input.officialSession.id,
      people_count: input.officialSession.state.peopleCount,
    }
  }

  if (!input.qrURLSource) {
    return undefined
  }

  const official = await createOfficialSession(input.qrURLSource)
  let officialSession = official.officialSession
  let peopleCount = official.state.peopleCount

  if (input.peopleCount && official.state.peopleCount !== input.peopleCount) {
    const updated = await setOfficialPeopleCount(official.id, input.peopleCount, officialSession)
    officialSession = updated.officialSession
    peopleCount = updated.state.peopleCount
  }

  officialSessions.set(checkoutId, officialSession)
  return {
    id: official.id,
    people_count: peopleCount,
  }
}

const validateLineItemsWithOfficialSession = async (
  checkoutId: string,
  lineItems: UcpLineItemInput[],
) => {
  let officialSession = officialSessions.get(checkoutId)
  if (!officialSession) {
    return lineItems
  }

  const officialLineItems: UcpLineItemInput[] = []

  for (const lineItem of lineItems) {
    const lookup = await lookupOfficialItem(officialSession.id, lineItem.item.id, officialSession)
    officialSession = lookup.officialSession
    officialSessions.set(checkoutId, officialSession)

    if (lookup.result.result !== 'OK' || !lookup.result.item_data) {
      throw new Error(`Item ${lineItem.item.id} was not found`)
    }

    if (lookup.result.item_data.state === 0) {
      throw new Error(`Item ${lineItem.item.id} is sold out`)
    }

    officialLineItems.push({
      item: {
        id: lookup.result.item_data.id,
        title: lookup.result.item_data.name,
        price: lookup.result.item_data.price,
      },
      quantity: lineItem.quantity,
    })
  }

  return officialLineItems
}

export const createUcpCheckoutSessionWithOfficialSession = async (
  input: CreateCheckoutSessionInput,
) => {
  const session = createUcpCheckoutSession(input)
  let officialSession

  try {
    officialSession = await createOfficialBinding(session.id, input)
    input.line_items = await validateLineItemsWithOfficialSession(session.id, input.line_items)
  } catch (error) {
    sessions.delete(session.id)
    officialSessions.delete(session.id)
    throw error
  }

  if (!officialSession) {
    return session
  }

  const updated = {
    ...refreshSessionShape(session, { line_items: input.line_items }),
    official_session: officialSession,
    updated_at: new Date().toISOString(),
  }
  sessions.set(session.id, updated)
  return updated
}

export const completeUcpCheckoutSession = async (id: string) => {
  const session = getUcpCheckoutSession(id)
  if (!session || session.status === 'completed' || session.status === 'canceled') {
    return undefined
  }
  const officialSession = officialSessions.get(id)
  if (!officialSession) {
    throw new Error('Official session is required to submit a UCP checkout')
  }

  const inProgress = {
    ...refreshSessionShape(session, {}),
    status: 'complete_in_progress' as const,
  }
  sessions.set(id, inProgress)

  let result
  try {
    result = await submitOfficialCart(
      officialSession.id,
      inProgress.line_items.map((lineItem) => ({
        id: lineItem.item.id,
        count: lineItem.quantity,
      })),
      officialSession,
    )
  } catch (error) {
    sessions.set(id, {
      ...inProgress,
      status: 'requires_escalation',
      messages: [
        {
          type: 'error',
          content: error instanceof Error ? error.message : 'Failed to submit order',
        },
      ],
      updated_at: new Date().toISOString(),
    })
    throw error
  }
  officialSessions.set(id, result.officialSession)

  const updated = {
    ...inProgress,
    status: 'completed' as const,
    official_session: {
      id: result.officialSession.id,
      people_count: result.state.peopleCount,
    },
    order: {
      id: `ord_${crypto.randomUUID()}`,
      checkout_id: id,
      permalink_url: session.continue_url ?? '/',
    },
  }
  officialSessions.delete(id)
  sessions.set(id, updated)
  return updated
}

export const cancelUcpCheckoutSession = (id: string) => {
  const session = getUcpCheckoutSession(id)
  if (!session || session.status === 'completed' || session.status === 'canceled') {
    return undefined
  }
  const updated = {
    ...session,
    status: 'canceled' as const,
    updated_at: new Date().toISOString(),
  }
  officialSessions.delete(id)
  sessions.set(id, updated)
  return updated
}
