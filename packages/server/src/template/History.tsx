/** @jsx react-jsx */
/** @jsxImportSource hono/jsx */
import { AmountSummary, OrderList, Shell } from './shared'

export const History = () => (
  <Shell page="history" title="注文履歴" ctrl="remember">
    <input type="hidden" id="code" name="code" value="" />
    <div id="body-section">
      <OrderList />
      <AmountSummary />
      <button type="submit" name="proc" value="menu" class="button">
        メニューへ
      </button>
    </div>
  </Shell>
)
