/** @jsx react-jsx */
/** @jsxImportSource hono/jsx */
export const Top = () => (
  <html lang="ja" itemscope itemtype="http://schema.org/WebPage">
    <head>
      {/*
Array
(
    [09cfab0e94e69f0c260117329865632d] => 
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
    [dummy_no] => 639a027817313561759
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
ROOT_PATH:      /home/pointsoft3/www/saizeriya3gv
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
      function gtag() {
        dataLayer.push(arguments);
      }
      gtag("js", new Date());
      gtag("config", "G-K1X5L7LJ8F");`}
      </script>
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
        href="./src/page/css/base.css.php?SN=525&amp;LG=1&amp;DD=6954a4f111b06"
      />
      <link
        rel="stylesheet"
        type="text/css"
        href="./src/page/css/top.css?DD=6954a4f111b07"
      />
      <link
        rel="stylesheet"
        type="text/css"
        href="./data/common/1/custom.css?DD=6954a4f111b11"
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
            class="top-page"
            action={`./?${crypto.randomUUID()}`}
            method="post"
          >
            <input type="hidden" id="proc" name="proc" value="top" />
            <input type="hidden" id="ctrl" name="ctrl" value="" />
            <input type="hidden" id="sub_ctrl" name="sub_ctrl" value="" />

            <input type="hidden" id="cur_lang" name="cur_lang" value="1" />

            <input type="hidden" id="message" name="message" value="" />

            <div id="header" class="float-clear">
              <h1 class="">いらっしゃいませ</h1>
            </div>
            <input type="hidden" id="shop-id" value="525" />
            <input type="hidden" id="table-no" value="51" />

            <div id="body-section" style="height: 772.345px">
              <div class="global">
                <ul class="language" id="language" name="language">
                  <li data-lang-id="1" class="selected">
                    日本語
                  </li>
                  <li data-lang-id="2">English</li>
                  <li data-lang-id="3">中文</li>
                </ul>
              </div>

              <div class="logo">
                <img
                  src="./data/525/img/logo.png"
                  alt="イタリアンワイン＆カフェレストラン サイゼリヤ"
                  title="イタリアンワイン＆カフェレストラン サイゼリヤ"
                />

                {/*p>※複数のスマホで注文された場合、<br />　会計伝票が１つにまとまります。</p*/}
                <div id="order" class="btn red">
                  注文をはじめる
                </div>
                <div id="number" class="btn text">
                  テーブル51　2名様
                </div>
              </div>
            </div>

            <div id="footer">
              <ul id="menu">
                <li id="order-add">
                  <p>
                    注文
                    <br />
                    追加
                  </p>
                </li>
                <li id="order-list" class="disabled">
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
                <li id="do-account">
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
        src="./src/page/js/base.js.php?JS=top.js.php&amp;SN=525&amp;LG=1&amp;DD=6954a4f111ba7"
      ></script>
    </body>
  </html>
)
