export type AlcoholClassifiableMenuItem = {
  name?: string
  kana?: string
  category?: string
  tags?: string[]
}

const normalizeClassificationText = (value: string) =>
  value.normalize('NFKC').replace(/\s+/g, '').toUpperCase()

const nonAlcoholKeywords = ['ノンアルコール', 'ノンアル', 'NONALCOHOL', 'NON-ALCOHOL'].map(
  normalizeClassificationText,
)

const alcoholKeywords = [
	'アルコール',
	'お酒',
	'酒類',
	'ワイン',
	'ビール',
	'ジョッキ',
	'サワー',
	'ハイボール',
	'ウイスキー',
	'ウィスキー',
	'焼酎',
	'日本酒',
	'カクテル',
	'シャンパン',
	'スパークリング',
	'デカンタ',
	'マグナム',
	'ランブルスコ',
	'キャンティ',
	'ベルデッキオ',
	'ドンラファエロ',
	'グラッパ',
	'氷結',
].map(normalizeClassificationText)

export const isAlcoholMenuItem = (item: AlcoholClassifiableMenuItem) => {
  const text = [item.name, item.kana, item.category, ...(item.tags ?? [])]
    .filter((value): value is string => Boolean(value))
    .map(normalizeClassificationText)
    .join(' ')

  if (!text || nonAlcoholKeywords.some((keyword) => text.includes(keyword))) {
    return false
  }

  return alcoholKeywords.some((keyword) => text.includes(keyword))
}
