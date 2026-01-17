import pLimit from 'p-limit'

export interface FetchedResult {
  item_data?: {
    id: string // 商品コード
    name: string // 半角カタカナ
    price: number // 価格
    messages: ['0', '2']
    mod_id: ''
    mod_name: ''
    mod_price: 0
    mod_ini_cnt: 0
    mod_guid: ''
    drk_id: ''
    drk_name: ''
    drk_price: 0
    drk_guid: ''
    popup: ''
    notice: ''
    arc_type: 0
    drk_type: 0
    main_type: 0
    state: 2
  }
  result: 'OK'
  alcohol_check: 0
}

async function fetchItem(
  shopId: number,
  tableNo: number,
  itemCode: number,
): Promise<FetchedResult> {
  const sid = shopId.toString() // 店舗ID
  const tno = tableNo.toString() // テーブルNo
  const lng = '1' // 言語
  const cd = itemCode.toString().padStart(4, '0') // 商品コード
  const num = '2' // 人数
  const ssid = ''

  const params = new URLSearchParams({
    sid: sid,
    tno: tno,
    lng: lng,
    id: cd,
    num: num,
    ssid: ssid,
  })
  const r = (await fetch(
    `https://ioes04.saizeriya.co.jp/saizeriya3/src/cmd/get_item.php`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: params,
    },
  ).then((res) => res.json())) as FetchedResult

  return r
}

const limit = pLimit(100)
const res: FetchedResult[] = []
const promises = []
for (let i = 0; i < 10000; i++) {
  promises.push(
    limit(() =>
      fetchItem(1113, 1, i).then((r) => {
        if (r.item_data) {
          res.push(r)
        }
        console.log(`Fetched item code 3205: ${i + 1}/10000`)
      }),
    ),
  )
}

await Promise.allSettled(promises)

await Bun.write('./data.json', JSON.stringify(res, null, 2))
