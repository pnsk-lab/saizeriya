import { HTMLElement, parse } from 'node-html-parser'

export class PageParser {
  readonly root: HTMLElement
  constructor(html: string) {
    this.root = parse(html)
  }

  getShopId(): number {
    const shopIdInput = this.root.querySelector('input[id="shop-id"]')
    if (!shopIdInput) {
      throw new Error('Shop ID input not found')
    }
    const value = shopIdInput.getAttribute('value')
    if (!value) {
      throw new Error('Shop ID value not found')
    }
    return Number.parseInt(value, 10)
  }
  getTableNo (): number {
    const tableNoInput = this.root.querySelector('input[id="table-no"]')
    if (!tableNoInput) {
      throw new Error('Table number input not found')
    }
    const value = tableNoInput.getAttribute('value')
    if (!value) {
      throw new Error('Table number value not found')
    }
    return Number.parseInt(value, 10)
  }
  getNextActionId(): string {
    const form = this.root.querySelector('form[id="frm_ctrl"]')
    if (!form) {
      throw new Error('Form with id "frm_ctrl" not found')
    }
    const action = form.getAttribute('action')
    if (!action) {
      throw new Error('Form action attribute not found')
    }
    const id = action.split('?')[1]
    if (!id) {
      throw new Error('No action id found in form action')
    }
    return id
  }
}
