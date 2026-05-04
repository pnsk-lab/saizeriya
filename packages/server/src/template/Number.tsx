/** @jsx react-jsx */
/** @jsxImportSource hono/jsx */
import { BrandLogo, Shell } from './shared'

export const PeopleNumber = () => (
  <Shell page="number" title="人数を入力してください">
    <div id="body-section">
      <div class="logo">
        <BrandLogo compact />
      </div>
      <div class="number">
        <input id="nox" type="number" value="2" min="1" max="99" />
      </div>
      <button type="submit" name="proc" value="menu" class="button">
        決定
      </button>
    </div>
  </Shell>
)
