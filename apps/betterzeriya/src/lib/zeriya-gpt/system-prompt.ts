import menuData from '$lib/assets/data/menu.json'
import { normalizeMenuName } from './menu-name-normalization'

type MenuItem = {
  item_data: {
    id: string
    name: string
    price: number
  }
  alcohol_check?: number
}

export const buildMenuList = () =>
  (menuData as MenuItem[])
    .filter((item) => item.item_data.price > 0)
    .map((item) => `- ${normalizeMenuName(item.item_data.name)} (${item.item_data.price}円)`)
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
