/** @jsx react-jsx */
/** @jsxImportSource hono/jsx */
import { BrandLogo, Shell } from './shared'

export const Receipt = () => (
  <Shell page="receipt" title="お会計を確定しました">
    <div id="body-section">
      <p class="table">51</p>
      <div class="logo">
        <BrandLogo compact />
      </div>
      <div class="barcode">
        <img
          src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMoAAAAeCAQAAACd/awtAAAAMUlEQVR42u3PMQEAAAgDoJvc6FELC4EwSUJCQkJCQkJCQkJCQkJCQkJCQkJCQkKuAX6DAAFs7hJXAAAAAElFTkSuQmCC"
          alt=""
        />
        <p>000000000000</p>
      </div>
      <p class="comment align-justify">この画面をレジで提示ください。</p>
      <p class="comment2">この画面は、お会計後に閉じられます。</p>
    </div>
  </Shell>
)
