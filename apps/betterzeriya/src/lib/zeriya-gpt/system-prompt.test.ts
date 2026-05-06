import { describe, expect, it } from 'vite-plus/test'
import { normalizeMenuName } from './menu-name-normalization'

describe('zeriyaGPT system prompt', () => {
  it('normalizes menu names with Unicode compatibility forms', () => {
    expect(normalizeMenuName('　ﾗﾝﾁ)ﾊﾟﾙﾏ風ｽﾊﾟｹﾞｯﾃｨ\u200B ')).toBe('ランチ)パルマ風スパゲッティ')
    expect(normalizeMenuName('ＡＢＣ１２３　小ｴﾋﾞのｻﾗﾀﾞ')).toBe('ABC123 小エビのサラダ')
  })
})
