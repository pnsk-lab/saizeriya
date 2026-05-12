import menuData from '$lib/assets/data/menu.json'

export const UCP_VERSION = '2026-04-08'
export const UCP_SHOPPING_SERVICE = 'dev.ucp.shopping'
export const UCP_CHECKOUT_CAPABILITY = 'dev.ucp.shopping.checkout'
export const UCP_GOOGLE_PAY_HANDLER = 'com.google.pay'

type UcpCheckoutStatus =
  | 'incomplete'
  | 'requires_escalation'
  | 'ready_for_complete'
  | 'complete_in_progress'
  | 'completed'
  | 'canceled'

type UcpBuyer = Record<string, unknown>
type UcpPayment = Record<string, unknown>

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
  payment?: UcpPayment
}

interface UpdateCheckoutSessionInput {
  line_items?: UcpLineItemInput[]
  buyer?: UcpBuyer
  currency?: string
  payment?: UcpPayment
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
  payment: {
    handlers: Array<{ id: string; handler_id: string; type: 'google_pay' }>
    instruments: unknown[]
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
const sessionTtlMs = 1000 * 60 * 60 * 6

export const createUcpMetadata = () => ({
  version: UCP_VERSION,
  capabilities: {
    [UCP_CHECKOUT_CAPABILITY]: [{ version: UCP_VERSION }],
  },
  payment_handlers: {
    [UCP_GOOGLE_PAY_HANDLER]: [
      {
        id: 'betterzeriya_google_pay',
        version: UCP_VERSION,
        available_instruments: [{ type: 'card' }],
        config: {
          allowed_payment_methods: [
            {
              type: 'CARD',
              parameters: {
                allowed_auth_methods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                allowed_card_networks: ['VISA', 'MASTERCARD', 'AMEX', 'JCB'],
              },
            },
          ],
        },
      },
    ],
  },
})

const pruneSessions = () => {
  const now = Date.now()
  for (const [id, session] of sessions) {
    if (Date.parse(session.updated_at) + sessionTtlMs < now) {
      sessions.delete(id)
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

const createPayment = (): UcpCheckoutSession['payment'] => ({
  handlers: [
    {
      id: 'betterzeriya_google_pay',
      handler_id: 'betterzeriya_google_pay',
      type: 'google_pay',
    },
  ],
  instruments: [],
})

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
    payment: input.payment ? { ...session.payment, instruments: [input.payment] } : session.payment,
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
    payment: input.payment ? { ...createPayment(), instruments: [input.payment] } : createPayment(),
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

export const completeUcpCheckoutSession = (id: string, payment?: UcpPayment) => {
  const session = getUcpCheckoutSession(id)
  if (!session || session.status === 'completed' || session.status === 'canceled') {
    return undefined
  }
  const updated = {
    ...refreshSessionShape(session, { payment }),
    status: 'completed' as const,
    order: {
      id: `ord_${crypto.randomUUID()}`,
      checkout_id: id,
      permalink_url: session.continue_url ?? '/',
    },
  }
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
  sessions.set(id, updated)
  return updated
}
