/** @jsx react-jsx */
/** @jsxImportSource hono/jsx */
import { BrandLogo, Shell } from './shared'

export const Top = ({ page = 'top' }: { page?: 'entry' | 'top' }) => (
  <Shell page={page} title="人数を確認してください">
    <div id="body-section">
      <div class="logo">
        <BrandLogo />
      </div>
      <div id="number" class="btn text">
        2名
      </div>
      <button type="button" data-action="change-people" class="button">
        人数を変更
      </button>
      <button type="button" id="order" class="button">
        注文を始める
      </button>
    </div>
  </Shell>
)
