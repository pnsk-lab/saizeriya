import menuData from '$lib/assets/data/menu.json'

type MenuItem = {
  item_data: {
    id: string
    name: string
    price: number
  }
  alcohol_check?: number
}

const halfToFullKana = (text: string) => {
  const map: Record<string, string> = {
    ｶﾞ: 'ガ',
    ｷﾞ: 'ギ',
    ｸﾞ: 'グ',
    ｹﾞ: 'ゲ',
    ｺﾞ: 'ゴ',
    ｻﾞ: 'ザ',
    ｼﾞ: 'ジ',
    ｽﾞ: 'ズ',
    ｾﾞ: 'ゼ',
    ｿﾞ: 'ゾ',
    ﾀﾞ: 'ダ',
    ﾁﾞ: 'ヂ',
    ﾂﾞ: 'ヅ',
    ﾃﾞ: 'デ',
    ﾄﾞ: 'ド',
    ﾊﾞ: 'バ',
    ﾋﾞ: 'ビ',
    ﾌﾞ: 'ブ',
    ﾍﾞ: 'ベ',
    ﾎﾞ: 'ボ',
    ﾊﾟ: 'パ',
    ﾋﾟ: 'ピ',
    ﾌﾟ: 'プ',
    ﾍﾟ: 'ペ',
    ﾎﾟ: 'ポ',
    ｳﾞ: 'ヴ',
    ｱ: 'ア',
    ｲ: 'イ',
    ｳ: 'ウ',
    ｴ: 'エ',
    ｵ: 'オ',
    ｶ: 'カ',
    ｷ: 'キ',
    ｸ: 'ク',
    ｹ: 'ケ',
    ｺ: 'コ',
    ｻ: 'サ',
    ｼ: 'シ',
    ｽ: 'ス',
    ｾ: 'セ',
    ｿ: 'ソ',
    ﾀ: 'タ',
    ﾁ: 'チ',
    ﾂ: 'ツ',
    ﾃ: 'テ',
    ﾄ: 'ト',
    ﾅ: 'ナ',
    ﾆ: 'ニ',
    ﾇ: 'ヌ',
    ﾈ: 'ネ',
    ﾉ: 'ノ',
    ﾊ: 'ハ',
    ﾋ: 'ヒ',
    ﾌ: 'フ',
    ﾍ: 'ヘ',
    ﾎ: 'ホ',
    ﾏ: 'マ',
    ﾐ: 'ミ',
    ﾑ: 'ム',
    ﾒ: 'メ',
    ﾓ: 'モ',
    ﾔ: 'ヤ',
    ﾕ: 'ユ',
    ﾖ: 'ヨ',
    ﾗ: 'ラ',
    ﾘ: 'リ',
    ﾙ: 'ル',
    ﾚ: 'レ',
    ﾛ: 'ロ',
    ﾜ: 'ワ',
    ｦ: 'ヲ',
    ﾝ: 'ン',
    ｬ: 'ャ',
    ｭ: 'ュ',
    ｮ: 'ョ',
    ｯ: 'ッ',
    ｰ: 'ー',
    '､': '、',
    '｡': '。',
    '｢': '「',
    '｣': '」',
    '･': '・',
  }
  let result = ''
  for (let i = 0; i < text.length; i++) {
    const pair = text.slice(i, i + 2)
    if (map[pair]) {
      result += map[pair]
      i++
      continue
    }
    result += map[text[i]] ?? text[i]
  }
  return result
}

export const normalizeMenuName = halfToFullKana

export const buildMenuList = () =>
  (menuData as MenuItem[])
    .filter((item) => item.item_data.price > 0)
    .map((item) => `- ${halfToFullKana(item.item_data.name)} (${item.item_data.price}円)`)
    .join('\n')

export const buildSystemPrompt =
  () => `あなたは「zeriyaGPT」、サイゼリヤのメニューに詳しいフレンドリーな日本語アシスタントです。
ユーザーの予算・気分・人数・好みに合わせて、下記メニューから具体的な組み合わせを提案してください。

ルール:
- 必ず日本語で答える
- 提案するときは品名と価格(円)を併記し、最後に合計金額を出す
- 下記メニューにない料理は提案しない
- 飾らずに、テンポよく短めに答える

# 利用可能なメニュー
${buildMenuList()}`
