/** @jsx react-jsx */
/** @jsxImportSource hono/jsx */
import { AmountSummary, OrderList, Shell } from './shared'

export const Main = () => (
  <Shell page="main" title="注文内容を確認してください" ctrl="remember">
    <input type="hidden" id="code" name="code" value="" />
    <input type="hidden" id="drinkbar-cnt" name="drinkbar-cnt" value="0" />
    <input type="hidden" id="alcohol-cnt" name="alcohol-cnt" value="0" />
    <input type="hidden" id="ord-drkbar-cnt" name="ord-drkbar-cnt" value="0" />
    <input type="hidden" id="is-first-order" value="YES" />
    <div id="body-section">
      <OrderList />
      <AmountSummary />
      <div class="command">
        <button
          id="menu"
          type="submit"
          name="proc"
          value="menu"
          class="btn green"
        >
          追　加
        </button>
        <button
          id="order"
          type="submit"
          name="proc"
          value="order"
          class="btn red"
        >
          注文する
        </button>
      </div>
    </div>
  </Shell>
)
