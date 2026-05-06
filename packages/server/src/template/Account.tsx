/** @jsx react-jsx */
/** @jsxImportSource hono/jsx */
import { AmountSummary, OrderList, Shell } from './shared'

export const Account = () => (
  <Shell page="account" title="お会計内容">
    <div id="body-section">
      <OrderList />
      <AmountSummary />
      <div class="command">
        <button type="button" id="decide" class="button">
          Continue
        </button>
      </div>
    </div>
  </Shell>
)
