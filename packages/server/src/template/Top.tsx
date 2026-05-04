/** @jsx react-jsx */
/** @jsxImportSource hono/jsx */
import { BrandLogo, Shell } from './shared'

export const Top = () => (
  <Shell page="top" title="人数を確認してください">
    <div id="body-section">
      <div class="logo">
        <BrandLogo />
      </div>
      <div id="number" class="btn text">
        2名
      </div>
      <button type="submit" name="proc" value="number" class="button">
        人数を変更
      </button>
      <button type="submit" name="proc" value="menu" class="button">
        注文を始める
      </button>
    </div>
  </Shell>
)
