interface UcpLineItem {
  item: {
    id: string
    title?: string
  }
  quantity: number
}

interface UcpBuyer {
  full_name?: string
  email?: string
}

interface CreateCheckoutSessionInput {
  line_items: UcpLineItem[]
  buyer?: UcpBuyer
  currency?: string
}

interface UcpCheckoutSession {
  id: string
  status: 'requires_action' | 'completed'
  currency: string
  buyer?: UcpBuyer
  line_items: UcpLineItem[]
  created_at: string
  updated_at: string
}

const sessions = new Map<string, UcpCheckoutSession>()

export const createUcpCheckoutSession = (input: CreateCheckoutSessionInput) => {
  const now = new Date().toISOString()
  const session: UcpCheckoutSession = {
    id: crypto.randomUUID(),
    status: 'requires_action',
    currency: input.currency ?? 'JPY',
    buyer: input.buyer,
    line_items: input.line_items,
    created_at: now,
    updated_at: now,
  }
  sessions.set(session.id, session)
  return session
}

export const getUcpCheckoutSession = (id: string) => sessions.get(id)

export const completeUcpCheckoutSession = (id: string) => {
  const session = sessions.get(id)
  if (!session) return undefined
  const updated = {
    ...session,
    status: 'completed' as const,
    updated_at: new Date().toISOString(),
  }
  sessions.set(id, updated)
  return updated
}
