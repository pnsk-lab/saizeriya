import { type HTMLElement, parse } from 'node-html-parser'
import type { AccountSummary } from '../types'

export type PageKind =
  | 'entry'
  | 'top'
  | 'number'
  | 'menu'
  | 'main'
  | 'history'
  | 'call'
  | 'account'
  | 'receipt'
  | 'unknown'

export class PageParser {
  readonly root: HTMLElement
  constructor(html: string) {
    this.root = parse(html, { parseNoneClosedTags: true })
  }

  getOptionalInputValue(selector: string): string | undefined {
    return this.root.querySelector(selector)?.getAttribute('value')
  }

  getInputValue(selector: string, label: string): string {
    const value = this.getOptionalInputValue(selector)
    if (value === undefined) {
      throw new Error(`${label} value not found`)
    }
    return value
  }

  getShopId(): number {
    return Number.parseInt(this.getInputValue('input[id="shop-id"]', 'Shop ID'), 10)
  }

  getTableNo(): number {
    return Number.parseInt(this.getInputValue('input[id="table-no"]', 'Table number'), 10)
  }

  getToken(): string | undefined {
    return this.getOptionalInputValue('input[name="token"]')
  }

  getSessionId(): string | undefined {
    return this.getOptionalInputValue('input[id="session-id"]')
  }

  getPeopleCount(): number | undefined {
    const value = this.getOptionalInputValue('input[id="number"]')
    if (value) {
      return Number.parseInt(value, 10)
    }

    const numberText = this.root.querySelector('#number')?.text.trim()
    const topPageCount = numberText?.match(/(\d+)\s*名/)?.[1]
    return topPageCount ? Number.parseInt(topPageCount, 10) : undefined
  }

  getPageKind(): PageKind {
    const pageClass = this.root
      .querySelector('form[id="frm_ctrl"]')
      ?.getAttribute('class')
      ?.split(/\s+/)
      .find((className) => className.endsWith('-page'))

    if (!pageClass) {
      return 'unknown'
    }

    const kind = pageClass.replace(/-page$/, '')
    if (
      kind === 'top' ||
      kind === 'entry' ||
      kind === 'number' ||
      kind === 'menu' ||
      kind === 'main' ||
      kind === 'history' ||
      kind === 'call' ||
      kind === 'account' ||
      kind === 'receipt'
    ) {
      return kind
    }
    return 'unknown'
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

  getAccountSummary(): AccountSummary {
    const html = this.root.toString()
    const controlNo = html.match(/\[control_no\]\s*=>\s*([^\s]+)/)?.[1]
    const dummyNo = html.match(/\[dummy_no\]\s*=>\s*([^\s]+)/)?.[1]
    const lines = this.root
      .querySelectorAll('#body-section .list-base table tbody tr')
      .map((row) => {
        const cells = row.querySelectorAll('td')
        const name = cells[0]?.text.trim() ?? ''
        const count = Number.parseInt(cells[1]?.text.trim() ?? '0', 10)
        const price = Number.parseInt((cells[2]?.text.trim() ?? '0').replace(/,/g, ''), 10)
        return { name, count, price }
      })
      .filter((line) => line.name && Number.isFinite(line.count))

    const count = Number.parseInt(
      this.root.querySelector('#body-section .amount .count span')?.text.trim() ?? '0',
      10,
    )
    const total = Number.parseInt(
      (this.root.querySelector('#body-section .amount .amount span')?.text.trim() ?? '0').replace(
        /,/g,
        '',
      ),
      10,
    )

    return {
      lines,
      count: Number.isFinite(count) ? count : lines.reduce((sum, line) => sum + line.count, 0),
      total: Number.isFinite(total) ? total : lines.reduce((sum, line) => sum + line.price, 0),
      controlNo,
      dummyNo,
    }
  }

  getReceiptSummary() {
    const barcodeImageSrc = this.root
      .querySelector('.receipt-page .barcode img')
      ?.getAttribute('src')
    const barcodeValue = this.root
      .querySelector('.receipt-page .barcode p')
      ?.text.trim()
      .replace(/\s/g, '')

    return {
      barcodeValue: barcodeValue || undefined,
      barcodeImageSrc: barcodeImageSrc || undefined,
    }
  }
}
