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
        <div class="preset-people">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => (
            <button type="button" id={`no${count}`} class="btn num">
              {count}
            </button>
          ))}
          <button type="button" id="no9" class="btn num ent">
            9+
          </button>
        </div>
        <div class="manual-people">
          <input id="nox" type="number" value="2" min="1" max="99" />
          <button type="button" id="back" class="btn gray">
            Back
          </button>
          <button type="button" id="decide" class="btn red">
            OK
          </button>
        </div>
      </div>
    </div>
  </Shell>
)
