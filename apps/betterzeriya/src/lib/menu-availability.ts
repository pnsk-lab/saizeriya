export type MenuServicePeriod = 'lunch' | 'regular'

export type MenuAvailabilityItem = {
  code: string
  name: string
  kana: string
  price: number
  category: string
  tags: string[]
  imageUrl: string | null
}

const currentLunchEntreeCodes = new Set([
  '1116',
  '1120',
  '1135',
  '1140',
  '1141',
  '1142',
  '1145',
  '1170',
  '1171',
  '1172',
  '1175',
])

const currentLunchServiceCodes = new Set(['1199', '1999', '5101'])
const lunchOnlyServiceCodes = new Set(['1199', '1999'])

const currentLunchCodes = new Set([...currentLunchEntreeCodes, ...currentLunchServiceCodes])

const tokyoDateParts = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Tokyo',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const weekdayIndexes: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

export const isLunchPeriod = (date = new Date()) => {
  const parts = Object.fromEntries(
    tokyoDateParts.formatToParts(date).map((part) => [part.type, part.value]),
  )
  const day = weekdayIndexes[parts.weekday ?? ''] ?? 0
  const minutes = Number(parts.hour ?? 0) * 60 + Number(parts.minute ?? 0)
  return day >= 1 && day <= 5 && minutes < 15 * 60
}

export const getMenuServicePeriod = (date = new Date()): MenuServicePeriod =>
  isLunchPeriod(date) ? 'lunch' : 'regular'

export const isCurrentLunchMenuItem = (item: Pick<MenuAvailabilityItem, 'code'>) =>
  currentLunchCodes.has(item.code)

export const isLunchNamedMenuItem = (item: Pick<MenuAvailabilityItem, 'name' | 'category'>) =>
  item.category === 'ランチ' || item.name.includes('ﾗﾝﾁ') || item.name.includes('ランチ')

export const isStaleLunchMenuItem = (
  item: Pick<MenuAvailabilityItem, 'code' | 'name' | 'category'>,
) => isLunchNamedMenuItem(item) && !isCurrentLunchMenuItem(item)

export const isLunchOnlyMenuItem = (
  item: Pick<MenuAvailabilityItem, 'code' | 'name' | 'category'>,
) =>
  currentLunchEntreeCodes.has(item.code) ||
  lunchOnlyServiceCodes.has(item.code) ||
  isStaleLunchMenuItem(item)

export const getDisplayCategory = (
  item: Pick<MenuAvailabilityItem, 'code' | 'category'>,
  period: MenuServicePeriod,
) => (period === 'lunch' && isCurrentLunchMenuItem(item) ? 'ランチ' : item.category)

export const filterMenuForServicePeriod = <T extends MenuAvailabilityItem>(
  items: T[],
  period: MenuServicePeriod,
) => {
  const visibleBaseItems = items.filter((item) => !isStaleLunchMenuItem(item))

  return visibleBaseItems
    .filter((item) => {
      if (period === 'regular') {
        return !isLunchOnlyMenuItem(item)
      }
      return true
    })
    .map((item) => ({
      ...item,
      category: getDisplayCategory(item, period),
    }))
}
