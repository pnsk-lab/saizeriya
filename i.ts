import pLimit from 'p-limit'

async function yobidashi(shopId: number, tableNo: number) {
  await fetch(
    'https://ioes04.saizeriya.co.jp/saizeriya3/src/cmd/tbl_call.php',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: new URLSearchParams({
        sid: shopId.toString(), // 店舗ID
        tbl: tableNo.toString(), // テーブルNo
        aft: 'false', // デザート呼び出しか
      }),
    },
  ).then(r => r.json()).then(console.log)
}

await yobidashi(525, 10)