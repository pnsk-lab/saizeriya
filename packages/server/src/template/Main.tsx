/** @jsx react-jsx */
/** @jsxImportSource hono/jsx */
export const Main = () => (
  <html lang="ja" itemscope itemtype="http://schema.org/WebPage">
    <head>
      {/*
Array
(
    [877f5caba385e424e3411ac87134f8bd] => 
    [proc] => main
    [ctrl] => 
    [sub_ctrl] => 
    [cur_lang] => 1
    [message] => 
    [ord-drkbar-cnt] => 0
    [is_reorder] => 0
    [order-time] => 
    [token] => 6954a673b87de4.98894231
    [code] => 
    [amount] => 1
    [mod_code] => 
    [mod_amount] => 1
)
Array
(
)
Array
(
    [shop_no] => 525
    [terminal_no] => 9
    [zone_no] => 1
    [table_no] => 51
    [sheet_no] => 0
    [control_no] => 03953459
    [dummy_no] => 639027817313561759
    [cart] => Array
        (
        )

    [cur_lang] => 1
    [number] => 2
)
Array
(
    [ID1] => Array
        (
            [lang_id] => 1
            [lang_name] => 日本語
            [lang_code] => ja
        )

    [ID2] => Array
        (
            [lang_id] => 2
            [lang_name] => English
            [lang_code] => en
        )

    [ID3] => Array
        (
            [lang_id] => 3
            [lang_name] => 中文
            [lang_code] => zh
        )

)
Array
(
    [customer_id] => 1
    [shop_id] => 525
    [customer_name] => Saizeriya Co,. Ltd.
    [shop_name] => サイゼリヤ
    [shop_tel] => 
    [master_ver] => 1
    [init_lang_id] => 1
    [use_call] => 1
)
ROOT_PATH:      /home/pointsoft3/www/saizeriya3
CMN_ROOT_PATH: /home/pointsoft3/www/saizeriya3
SESSION ID: ct9l2l29bk60na8pecl32os72b
*/}
      <meta charset="UTF-8" />
      <title>株式会社サイゼリヤ モバイルオーダーシステム</title>
      <meta name="viewport" content="width=device-width" />
      <meta name="color-scheme" content="light" />
      {/* テーマカラー */}
      <meta name="theme-color" content="#219228" />
      {/* テーマカラー　モード指定 */}
      <meta
        name="theme-color"
        media="(prefers-color-scheme: light)"
        content="#219228"
      />
      <meta
        name="theme-color"
        media="(prefers-color-scheme: dark)"
        content="#219228"
      />
      <meta http-equiv="Cache-Control" content="no-cache" />
      <meta name="description" content="" />
      <meta http-equiv="Content-Language" content="ja" />
      <meta name="google" content="notranslate" />
      <link rel="shortcut icon" href="./data/525/img/favicon.ico" />
      {/* Google tag (gtag.js) */}
      <script
        async
        src="https://www.googletagmanager.com/gtag/js?id=G-K1X5L7LJ8F"
      ></script>
      <script>
        {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-K1X5L7LJ8F');`}
      </script>{' '}
      <link rel="preconnect" href="https://fonts.gstatic.com" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&amp;display=swap&amp;text=0123456789,."
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@100;300;400;500;700;900&amp;display=swap"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=M+PLUS+1:wght@100;200;300;400;500;600;700;800;900&amp;display=swap"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Murecho:wght@100;200;300;400;500;600;700;800;900&amp;display=swap"
      />
      <link
        rel="stylesheet"
        type="text/css"
        href="//ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/themes/smoothness/jquery-ui.css"
      />
      <link
        rel="stylesheet"
        type="text/css"
        href="./src/page/css/foundation.min.css"
      />
      <link
        rel="stylesheet"
        type="text/css"
        href="./src/page/css/base.css.php?SN=525&amp;LG=1&amp;DD=6954a6a3c6446"
      />
      <link
        rel="stylesheet"
        type="text/css"
        href="./src/page/css/main.css?DD=6954a6a3c6447"
      />
      <link
        rel="stylesheet"
        type="text/css"
        href="./data/common/1/custom.css?DD=6954a6a3c645e"
      />
      <meta name="theme-color" content="#ffffff" />
      <meta
        name="format-detection"
        content="telephone=no,address=no,email=no"
      />
      <meta name="ROBOTS" content="NOINDEX,NOFOLLOW" />
    </head>

    <body>
      <div class="off-canvas-wrap">
        <div class="inner-wrap portrait">
          <form
            id="frm_ctrl"
            class="main-page"
            action={`./?${crypto.randomUUID()}`}
            method="post"
          >
            <input type="hidden" id="proc" name="proc" value="main" />
            <input type="hidden" id="ctrl" name="ctrl" value="remember" />
            <input type="hidden" id="sub_ctrl" name="sub_ctrl" value="" />

            <input type="hidden" id="cur_lang" name="cur_lang" value="1" />

            <input type="hidden" id="message" name="message" value="" />

            <div id="header" class="float-clear">
              <h1 class="blinking">
                他に注文があれば「追加」、なければ「注文」
              </h1>
            </div>
            <input type="hidden" id="code" name="code" value="" />

            <input type="hidden" id="shop-id" value="525" />
            <input type="hidden" id="number" value="2" />
            <input
              type="hidden"
              id="drinkbar-cnt"
              name="drinkbar-cnt"
              value="0"
            />
            <input
              type="hidden"
              id="alcohol-cnt"
              name="alcohol-cnt"
              value="0"
            />
            <input
              type="hidden"
              id="ord-drkbar-cnt"
              name="ord-drkbar-cnt"
              value="0"
            />
            <input type="hidden" id="is-first-order" value="YES" />

            <div id="body-section" style="height: 772.345px;">
              <input
                type="hidden"
                id="token"
                name="token"
                value="6954a6a3c646a5.93625306"
              />
              <div class="list" style="height: 574.109px;">
                <table>
                  <tbody></tbody>
                </table>
              </div>

              <div class="amount">
                <p class="count">
                  <span>0</span>点
                </p>
                <p class="amount">
                  合計&nbsp;<span>0</span>円 (税込)
                </p>
              </div>

              <div class="command">
                <div id="menu" class="btn green">
                  追　加
                </div>
                <div id="order" class="btn red">
                  注　文
                </div>
              </div>
            </div>

            <div id="footer">
              <ul id="menu">
                <li id="order-add" class="disabled">
                  <p>
                    注文
                    <br />
                    追加
                  </p>
                </li>
                <li id="order-list" class="disabled selected">
                  <p>
                    注文
                    <br />
                    かご
                  </p>
                </li>
                <li id="order-history">
                  <p>
                    注文
                    <br />
                    履歴
                  </p>
                </li>
                <li id="after-call">
                  <p>
                    店員
                    <br />
                    呼出
                  </p>
                </li>
                <li id="do-account" class="disabled">
                  <p>
                    会計
                    <br />
                    する
                  </p>
                </li>
              </ul>
              <p id="copy">©2023 Saizeriya Co,. Ltd. All rights reserved.</p>
            </div>
          </form>
        </div>
        {/* inner-wrap */}
        <div class="inner-wrap landscape">
          <div id="caution-section">
            <p>画面を縦にしてご利用ください。</p>
          </div>
        </div>
      </div>
      {/* off-canvas-wrap */}

      <script
        type="text/javascript"
        src="//ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"
      ></script>
      <script
        type="text/javascript"
        src="//ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js"
      ></script>

      <script
        type="text/javascript"
        src="//cdnjs.cloudflare.com/ajax/libs/sprintf/1.1.2/sprintf.min.js"
      ></script>

      <script
        type="text/javascript"
        src="./src/page/js/base.js.php?JS=main.js.php&amp;SN=525&amp;LG=1&amp;DD=6954a6a3c6495"
      ></script>
    </body>
  </html>
)
