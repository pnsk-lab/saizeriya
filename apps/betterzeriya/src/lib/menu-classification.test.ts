import { describe, expect, it } from 'vite-plus/test'
import { isAlcoholMenuItem, type AlcoholClassifiableMenuItem } from './menu-classification'

const item = (entry: Partial<AlcoholClassifiableMenuItem>): AlcoholClassifiableMenuItem => ({
  name: 'ミラノ風ドリア',
  kana: 'ミラノフウドリア',
  category: 'ドリア・グラタン',
  tags: [],
  ...entry,
})

describe('menu classification', () => {
  it('detects Saizeriya wine menu items', () => {
    expect(isAlcoholMenuItem(item({ name: '赤ｸﾞﾗｽﾜｲﾝ', category: 'ワイン' }))).toBe(true)
    expect(isAlcoholMenuItem(item({ name: '赤ﾃﾞｶﾝﾀ小', category: 'ワイン' }))).toBe(true)
  })

  it('detects alcohol from common drink names and tags', () => {
    expect(isAlcoholMenuItem(item({ name: '生ビール', category: 'ドリンク' }))).toBe(true)
    expect(isAlcoholMenuItem(item({ tags: ['アルコール'] }))).toBe(true)
  })

  it('detects draft beer mug and frozen alcohol items', () => {
    expect(isAlcoholMenuItem(item({ name: '中ジョッキ', category: 'ドリンク' }))).toBe(true)
    expect(isAlcoholMenuItem(item({ name: '氷結レモン', category: 'ドリンク' }))).toBe(true)
  })

  it('does not classify food, soft drinks, or non-alcohol drinks as alcohol', () => {
    expect(isAlcoholMenuItem(item({}))).toBe(false)
    expect(isAlcoholMenuItem(item({ name: 'セットドリンクバー', category: 'ドリンク' }))).toBe(false)
    expect(isAlcoholMenuItem(item({ name: 'ノンアルコールビール', category: 'ドリンク' }))).toBe(false)
  })
})
