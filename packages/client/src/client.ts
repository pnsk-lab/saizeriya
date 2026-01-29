import { processQR } from './process-qr'
import { createFetch, type FetchSource } from './utils/fetch'
import { PageParser } from './utils/page-parser'
import { createQueueLocker } from './utils/queue-locker'

export interface ClientInit {
  qrURLSource: string
  fetchSource?: FetchSource
  peopleCount: number
}
export const createClient = async ({
  qrURLSource,
  fetchSource,
  peopleCount,
}: ClientInit) => {
  const fetch = createFetch(fetchSource)
  const qrURL = new URL(qrURLSource)

  const processedQR = await processQR(qrURL.toString(), fetch)
  let nextId = processedQR.id
  const baseURL = processedQR.baseURL

  const locker = createQueueLocker()

  // 人数選択に遷移
  locker(async () => {
    // proc=number&ctrl=forced&sub_ctrl=&cur_lang=1&message=
    const moved = new PageParser(
      await fetch(`${baseURL}?${nextId}`, {
        method: 'POST',
        // proc=number&ctrl=forced&sub_ctrl=&cur_lang=1&message=
        body: new URLSearchParams({
          proc: 'number',
          ctrl: 'forced',
          sub_ctrl: '',
          cur_lang: '1',
          message: '',
        }),
      }).then((res) => res.text()),
    )
    nextId = moved.getNextActionId()
    
    const token = moved.root.querySelector('input[name="token"]')?.getAttribute('value')
    if (!token) {
      throw new Error('Token not found on number selection page')
    }
    const sent = new PageParser(
      await fetch(`${baseURL}?${nextId}`, {
        method: 'POST',
        body: new URLSearchParams({
          proc: 'menu',
          ctrl: 'number',
          sub_ctrl: '',
          cur_lang: '1',
          message: '',
          token: token,
          number: peopleCount.toString(),
        }),
      }).then((res) => res.text()),
    )
    nextId = sent.getNextActionId()
  })

  return {
    async call () {
      // since this process uses async request, locker is not needed here
      await fetch(new URL('./src/cmd/tbl_call.php', baseURL), {
        method: 'POST',
        // sid=525&tbl=51&aft=false
        body: new URLSearchParams({
          sid: processedQR.shopId.toString(),
          tbl: processedQR.tableNo.toString(),
          aft: 'false',
        }),
      })
    },
    
  }
}
