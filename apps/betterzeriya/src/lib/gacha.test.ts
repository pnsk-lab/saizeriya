import { describe, expect, it } from 'vite-plus/test'
import { calculateExactBudgetGacha } from './gacha'

describe('exact budget gacha', () => {
  it('counts exact combinations and samples one of them', () => {
    const result = calculateExactBudgetGacha(
      [
        { name: 'A', price: 700 },
        { name: 'B', price: 300 },
        { name: 'C', price: 200 },
      ],
      1000,
    )

    expect(result.count).toBe(3n)
    expect(result.sample).not.toBeNull()
    expect(result.sample?.reduce((sum, selection) => sum + selection.subtotal, 0)).toBe(1000)
  })

  it('returns no sample when no exact combination exists', () => {
    const result = calculateExactBudgetGacha([{ name: 'A', price: 600 }], 1000)

    expect(result.count).toBe(0n)
    expect(result.sample).toBeNull()
  })
})
