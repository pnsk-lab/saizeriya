export type PriceItem = {
  name: string
  price: number
}

export type ExactBudgetSelection<T extends PriceItem> = {
  item: T
  quantity: number
  subtotal: number
}

export type ExactBudgetResult<T extends PriceItem> = {
  count: bigint
  sample: ExactBudgetSelection<T>[] | null
}

export function calculateExactBudgetGacha<T extends PriceItem>(
  items: T[],
  target: number,
): ExactBudgetResult<T> {
  assertInput(items, target)

  const suffixGcd = Array.from<number>({ length: items.length + 1 }).fill(0)

  for (let index = items.length - 1; index >= 0; index -= 1) {
    suffixGcd[index] = gcd(items[index].price, suffixGcd[index + 1])
  }

  const memo = new Map<string, bigint>()

  const countSolutions = (itemIndex: number, rest: number): bigint => {
    if (rest === 0) {
      return 1n
    }

    if (rest < 0 || itemIndex >= items.length) {
      return 0n
    }

    const gcdValue = suffixGcd[itemIndex]
    if (gcdValue !== 0 && rest % gcdValue !== 0) {
      return 0n
    }

    const key = `${itemIndex}:${rest}`
    const cached = memo.get(key)
    if (cached !== undefined) {
      return cached
    }

    const item = items[itemIndex]
    const maxQuantity = Math.floor(rest / item.price)
    let total = 0n

    for (let quantity = 0; quantity <= maxQuantity; quantity += 1) {
      total += countSolutions(itemIndex + 1, rest - item.price * quantity)
    }

    memo.set(key, total)
    return total
  }

  const count = countSolutions(0, target)
  const sample = count > 0n ? sampleQuantities(items, 0, target, countSolutions) : null

  return {
    count,
    sample: sample ? quantitiesToSelections(items, sample) : null,
  }
}

function sampleQuantities<T extends PriceItem>(
  items: T[],
  itemIndex: number,
  rest: number,
  countSolutions: (itemIndex: number, rest: number) => bigint,
): number[] {
  if (rest === 0) {
    return Array.from<number>({ length: items.length - itemIndex }).fill(0)
  }

  if (itemIndex >= items.length) {
    return []
  }

  const item = items[itemIndex]
  const maxQuantity = Math.floor(rest / item.price)
  const choices: Array<{ quantity: number; weight: bigint }> = []
  let totalWeight = 0n

  for (let quantity = 0; quantity <= maxQuantity; quantity += 1) {
    const weight = countSolutions(itemIndex + 1, rest - item.price * quantity)
    if (weight > 0n) {
      choices.push({ quantity, weight })
      totalWeight += weight
    }
  }

  if (totalWeight === 0n) {
    return []
  }

  let cursor = randomBigIntLessThan(totalWeight)

  for (const choice of choices) {
    if (cursor < choice.weight) {
      return [
        choice.quantity,
        ...sampleQuantities(
          items,
          itemIndex + 1,
          rest - item.price * choice.quantity,
          countSolutions,
        ),
      ]
    }

    cursor -= choice.weight
  }

  throw new Error('Failed to sample an exact-budget combination')
}

function quantitiesToSelections<T extends PriceItem>(
  items: T[],
  quantities: number[],
): ExactBudgetSelection<T>[] {
  return quantities
    .map((quantity, index) => {
      if (quantity <= 0) {
        return null
      }

      const item = items[index]
      return {
        item,
        quantity,
        subtotal: item.price * quantity,
      }
    })
    .filter((selection): selection is ExactBudgetSelection<T> => selection !== null)
}

function randomBigIntLessThan(maximum: bigint): bigint {
  if (maximum <= 0n) {
    throw new Error('maximum must be positive')
  }

  const bitLength = maximum.toString(2).length
  const byteLength = Math.ceil(bitLength / 8)
  const unusedBits = byteLength * 8 - bitLength
  const mask = unusedBits > 0 ? 0xff >> unusedBits : 0xff

  while (true) {
    const bytes = new Uint8Array(byteLength)
    const cryptoApi = globalThis.crypto

    if (cryptoApi?.getRandomValues) {
      cryptoApi.getRandomValues(bytes)
    } else {
      for (let index = 0; index < byteLength; index += 1) {
        bytes[index] = Math.floor(Math.random() * 256)
      }
    }

    bytes[0] &= mask

    let value = 0n
    for (const byte of bytes) {
      value = (value << 8n) | BigInt(byte)
    }

    if (value < maximum) {
      return value
    }
  }
}

function assertInput(items: PriceItem[], target: number): void {
  if (!Number.isInteger(target) || target < 0) {
    throw new Error('target must be a non-negative integer')
  }

  for (const item of items) {
    if (!Number.isInteger(item.price) || item.price <= 0) {
      throw new Error(`price must be a positive integer: ${item.name}`)
    }
  }
}

function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)

  while (b !== 0) {
    const remainder = a % b
    a = b
    b = remainder
  }

  return a
}
