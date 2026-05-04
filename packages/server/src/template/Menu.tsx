/** @jsx react-jsx */
/** @jsxImportSource hono/jsx */
import { BrandLogo, Shell } from './shared'

export const Menu = () => (
  <Shell
    page="menu"
    title="メニューブックから番号を入力してください"
    ctrl="number"
  >
    <input type="hidden" id="drinkbar-cnt" name="drinkbar-cnt" value="0" />
    <input type="hidden" id="alcohol-cnt" name="alcohol-cnt" value="0" />
    <input type="hidden" id="ord-drkbar-cnt" name="ord-drkbar-cnt" value="0" />
    <input type="hidden" id="is_reorder" name="is_reorder" value="0" />
    <input type="hidden" id="order-time" name="order-time" value="" />
    <div id="body-section" class="base">
      <div class="menu">
        <div class="command">
          <div class="name">&nbsp;</div>
          <div id="order" class="btn red">
            注文
          </div>
        </div>
        <div class="logo">
          <BrandLogo compact />
        </div>
        <div class="code">
          <p id="enter">&nbsp;</p>
        </div>
        <div class="tenkey">
          <ul>
            <li class="btn gray" data-val="1">
              1
            </li>
            <li class="btn gray" data-val="2">
              2
            </li>
            <li class="btn gray" data-val="3">
              3
            </li>
            <li class="btn gray" data-val="4">
              4
            </li>
            <li class="btn gray" data-val="5">
              5
            </li>
            <li class="btn gray" data-val="6">
              6
            </li>
            <li class="btn gray" data-val="7">
              7
            </li>
            <li class="btn gray" data-val="8">
              8
            </li>
            <li class="btn gray" data-val="9">
              9
            </li>
            <li class="clear">&nbsp;</li>
            <li class="btn gray" data-val="0">
              0
            </li>
            <li class="btn green del">削除</li>
          </ul>
        </div>
        <div class="notice-balloon">
          <div class="balloon-arrow"></div>
          <div class="msg-base">
            <span>メニューブックの番号を入力してください。</span>
          </div>
        </div>
      </div>
      <div class="detail">
        <div class="main">
          <input type="hidden" id="code" name="code" value="" />
          <dl class="name">
            <dt>&nbsp;</dt>
            <dd>0円</dd>
          </dl>
          <ul class="amount">
            <li class="cmd" id="minus">
              -
            </li>
            <li>
              <input
                id="amount"
                name="amount"
                type="number"
                value="1"
                readonly
              />
            </li>
            <li class="cmd" id="plus">
              +
            </li>
          </ul>
        </div>
        <div class="mod" style="display: none;">
          <input type="hidden" id="mod_code" name="mod_code" value="" />
          <dl class="name">
            <dt>&nbsp;</dt>
            <dd></dd>
          </dl>
          <ul class="amount">
            <li class="cmd" id="minus">
              -
            </li>
            <li>
              <input
                id="mod_amount"
                name="mod_amount"
                type="number"
                value="0"
                readonly
              />
            </li>
            <li class="cmd" id="plus">
              +
            </li>
          </ul>
          <div id="guide" style="display: none;">
            <div class="balloon-arrow"></div>
            <div class="msg-base">
              <span></span>
            </div>
          </div>
        </div>
        <div class="command">
          <button
            type="submit"
            name="proc"
            value="menu"
            id="back"
            class="btn gray"
          >
            もどる
          </button>
          <button
            type="submit"
            name="proc"
            value="main"
            id="deside"
            class="btn red"
          >
            確 定
          </button>
        </div>
      </div>
    </div>
  </Shell>
)
