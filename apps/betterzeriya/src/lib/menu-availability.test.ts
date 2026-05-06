import { describe, expect, it } from 'vite-plus/test'
import {
  filterMenuForServicePeriod,
  getMenuServicePeriod,
  type MenuAvailabilityItem,
} from './menu-availability'

const item = (code: string, name: string, category: string, price = 400): MenuAvailabilityItem => ({
  code,
  name,
  kana: name,
  price,
  category,
  tags: [],
  imageUrl: null,
})

describe('menu availability', () => {
  it('detects weekday lunch before 15:00', () => {
    expect(getMenuServicePeriod(new Date('2026-05-04T14:59:00+09:00'))).toBe('lunch')
    expect(getMenuServicePeriod(new Date('2026-05-04T15:00:00+09:00'))).toBe('regular')
    expect(getMenuServicePeriod(new Date('2026-05-03T12:00:00+09:00'))).toBe('regular')
  })

  it('shows both lunch and regular items during lunch', () => {
    const menu = [
      item('1135', 'ﾗﾝﾁ)ﾀﾗｺｿｰｽｼｼﾘｰ風', 'ランチ', 500),
      item('2301', 'ﾀﾗｺｿｰｽｼｼﾘｰ風', 'パスタ', 400),
      item('1202', '小ｴﾋﾞのｻﾗﾀﾞ', 'サラダ', 350),
    ]

    expect(filterMenuForServicePeriod(menu, 'lunch').map((entry) => entry.code)).toEqual([
      '1135',
      '2301',
      '1202',
    ])
  })

  it('shows regular item instead of lunch item outside lunch', () => {
    const menu = [
      item('1135', 'ﾗﾝﾁ)ﾀﾗｺｿｰｽｼｼﾘｰ風', 'ランチ', 500),
      item('2301', 'ﾀﾗｺｿｰｽｼｼﾘｰ風', 'パスタ', 400),
    ]

    expect(filterMenuForServicePeriod(menu, 'regular').map((entry) => entry.code)).toEqual(['2301'])
  })

  it('keeps the current lunch category only for current lunch codes', () => {
    const menu = [
      item('1115', 'ﾗﾝﾁ)ｽﾊﾟｹﾞｯﾃｨﾎﾟﾓﾄﾞｰﾛ', 'ランチ', 500),
      item('1120', 'ﾗﾝﾁ)ﾐｰﾄｿｰｽﾎﾞﾛﾆｱ風', 'パスタ', 500),
      item('2307', 'ｽﾊﾟｹﾞｯﾃｨﾎﾟﾓﾄﾞｰﾛ', 'パスタ', 400),
    ]

    expect(filterMenuForServicePeriod(menu, 'lunch').map((entry) => entry.code)).toEqual([
      '1120',
      '2307',
    ])
    expect(filterMenuForServicePeriod(menu, 'lunch')[0]?.category).toBe('ランチ')
  })
})
