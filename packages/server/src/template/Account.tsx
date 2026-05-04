/** @jsx react-jsx */
/** @jsxImportSource hono/jsx */
import { AmountSummary, OrderList, Shell } from './shared'

export const Account = () => (
  <Shell page="account" title="お会計内容">
    <div id="body-section">
      <OrderList />
      <AmountSummary />
      <button type="submit" name="proc" value="receipt" class="button">
        お会計を確定
      </button>
    </div>
  </Shell>
)
