/** @jsx react-jsx */
/** @jsxImportSource hono/jsx */
import { Shell } from './shared'

export const Call = () => (
  <Shell page="call" title="注文を送信しました">
    <div id="body-section">
      <p class="message">ご注文を受け付けました。</p>
      <div class="call">
        <ul data-shop="525" data-tbl="51">
          <li id="call-staff" class="btn red">
            店員を呼ぶ
          </li>
          <li id="call-after" class="btn red disabled">
            デザートを持ってきて
          </li>
        </ul>
      </div>
      <button type="submit" name="proc" value="menu" class="button">
        続けて注文
      </button>
      <button type="submit" name="proc" value="account" class="button">
        お会計
      </button>
    </div>
  </Shell>
)
