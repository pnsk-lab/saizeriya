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
        <div
          role="img"
          aria-label="Mock barcode"
          style="
            width: 210px;
            height: 44px;
            margin: 0 auto;
            background:
              repeating-linear-gradient(
                90deg,
                #111 0px,
                #111 2px,
                #fff 2px,
                #fff 5px,
                #111 5px,
                #111 6px,
                #fff 6px,
                #fff 10px
              );
            border: 1px solid #ddd;
          "
        />
        <p>525051001233</p>
      </div>

      <p class="comment align-justify">この画面をレジで提示ください。</p>
      <p class="comment2">この画面は、お会計後に閉じられます。</p>
    </div>
  </Shell>
)