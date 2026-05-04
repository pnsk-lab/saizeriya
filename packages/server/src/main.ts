import { Hono } from 'hono'
import menuData from './data/menu.json'
import { Account } from './template/Account'
import { Call } from './template/Call'
import { History } from './template/History'
import { Main } from './template/Main'
import { Menu } from './template/Menu'
import { PeopleNumber } from './template/Number'
import { Receipt } from './template/Receipt'
import { Top } from './template/Top'

export type Page =
  | 'history'
  | 'main'
  | 'top'
  | 'number'
  | 'menu'
  | 'call'
  | 'account'
  | 'receipt'
  | 'order'

interface PostedPageData {
  proc?: Page
  ctrl?: string
  number?: string
  code?: string
  amount?: string
  mod_code?: string
  mod_amount?: string
}

type DashboardTableData = {
  peopleCount?: string
  page?: Page
  lastOrderClosed?: string
  midnightCharge?: string
  orderStarted?: string
}

export interface MenuItem {
  id: string
  name: string
  price: number
  messages?: string[]
  mod_id?: string
  mod_name?: string
  mod_price?: number
  mod_ini_cnt?: number
  mod_guid?: string
  drk_id?: string
  drk_name?: string
  drk_price?: number
  drk_guid?: string
  popup?: string
  notice?: string
  arc_type?: number
  drk_type?: number
  main_type?: number
  state?: number
  alcohol_check?: number
}

interface MenuSeedItem {
  code: string
  name: string
  price: number
}

interface FetchedMenuItem {
  item_data?: MenuItem
  alcohol_check?: number
}

export interface CartLine {
  id: string
  count: number
  reorder: 0 | 1
  modId: string
  modCount: number | ''
}

interface OrderDisplayLine {
  id: string
  name: string
  count: number
  price: number
  modId: string
  modCount: number
  reorder: 0 | 1
}

export interface TableState {
  shopId: number
  tableId: number
  peopleCount: number
  page: Page
  token: string
  sessionId: string
  cart: CartLine[]
  staffCallCount: number
  dessertCallCount: number
  lastOrderClosed: boolean
  midnightCharge: boolean
  orderStarted: boolean
  submittedOrders: CartLine[][]
  receiptShown: boolean
}

export interface ServerOptions {
  menuItems?: MenuItem[]
}

const defaultMenuItems: MenuItem[] = (
  menuData as (MenuSeedItem | FetchedMenuItem)[]
)
  .map((item) => {
    if ('item_data' in item && item.item_data) {
      return {
        ...item.item_data,
        alcohol_check: item.alcohol_check ?? item.item_data.alcohol_check,
      }
    }

    if (!('code' in item)) {
      return null
    }

    return {
      id: item.code,
      name: item.name,
      price: item.price,
    }
  })
  .filter((item): item is MenuItem => Boolean(item?.id && item.name))

const json = (value: unknown) =>
  new Response(JSON.stringify(value), {
    headers: {
      'content-type': 'application/json; charset=UTF-8',
    },
  })

const toId = (value: unknown) => String(value)

const cloneCart = (cart: CartLine[]) => cart.map((item) => ({ ...item }))

const assetFile = (path: string) =>
  Bun.file(new URL(`../assets/${path}`, import.meta.url))

const pageComponents = {
  account: Account,
  call: Call,
  history: History,
  main: Main,
  menu: Menu,
  number: PeopleNumber,
  receipt: Receipt,
  top: Top,
} satisfies Record<Exclude<Page, 'order'>, () => unknown>

const setInputValue = (html: string, id: string, value: string) =>
  html.replace(
    new RegExp(`(<input[^>]*id="${id}"[^>]*value=")[^"]*(")`, 'g'),
    `$1${value}$2`,
  )

const setNamedInputValue = (html: string, name: string, value: string) =>
  html.replace(
    new RegExp(`(<input[^>]*name="${name}"[^>]*value=")[^"]*(")`, 'g'),
    `$1${value}$2`,
  )

const escapeHTML = (value: unknown) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const checked = (value: boolean) => (value ? ' checked' : '')

const formatAmount = (value: number) => value.toLocaleString('ja-JP')

const parseNumberField = (value: unknown, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export class Table {
  readonly id = crypto.randomUUID()
  readonly server: Server
  readonly state: TableState

  constructor(server: Server, shopId: number, tableId: number) {
    this.server = server
    this.state = {
      shopId,
      tableId,
      peopleCount: 2,
      page: 'top',
      token: `${crypto.randomUUID()}.${Math.random().toString().slice(2)}`,
      sessionId: crypto.randomUUID().replaceAll('-', ''),
      cart: [],
      staffCallCount: 0,
      dessertCallCount: 0,
      lastOrderClosed: false,
      midnightCharge: false,
      orderStarted: false,
      submittedOrders: [],
      receiptShown: false,
    }
  }

  createQRCodeURL(origin = 'http://example.com', basePath = '/saizeriya3') {
    return `${origin}${basePath}/qr?table=${this.id}`
  }

  setPeopleCount(count: number) {
    this.state.peopleCount = count
    return this
  }

  setPage(page: Page) {
    this.state.page = page
    return this
  }

  setLastOrderClosed(value: boolean) {
    this.state.lastOrderClosed = value
    return this
  }

  setMidnightCharge(value: boolean) {
    this.state.midnightCharge = value
    return this
  }

  setOrderStarted(value: boolean) {
    this.state.orderStarted = value
    return this
  }

  setCart(cart: CartLine[]) {
    this.state.cart = cloneCart(cart)
    return this
  }

  getState(): TableState {
    return {
      ...this.state,
      cart: cloneCart(this.state.cart),
      submittedOrders: this.state.submittedOrders.map(cloneCart),
    }
  }
}

export class Server {
  readonly app: Hono
  readonly menuItems = new Map<string, MenuItem>()
  readonly tables = new Map<string, Table>()

  readonly #urlIds = new Map<string, Table>()

  constructor(options: ServerOptions = {}) {
    this.setMenuItems(options.menuItems ?? defaultMenuItems)
    this.app = new Hono()
      .get('/dashboard', (c) => c.html(this.#renderDashboard()))
      .get('/dashboard/', (c) => c.html(this.#renderDashboard()))
      .post('/dashboard/tables', async (c) => {
        const form = await c.req.formData()
        this.createNewTable(
          parseNumberField(form.get('shopId'), 525),
          parseNumberField(form.get('tableId'), 51),
        )
        return c.redirect('/dashboard')
      })
      .post('/dashboard/table/:id', async (c) => {
        const table = this.tables.get(c.req.param('id'))
        if (table) {
          const form = await c.req.formData()
          const data = Object.fromEntries(form.entries()) as DashboardTableData
          table.state.peopleCount = parseNumberField(
            data.peopleCount,
            table.state.peopleCount,
          )
          table.state.page = data.page ?? table.state.page
          table.state.lastOrderClosed = data.lastOrderClosed === 'on'
          table.state.midnightCharge = data.midnightCharge === 'on'
          table.state.orderStarted = data.orderStarted === 'on'
        }
        return c.redirect('/dashboard')
      })
      .post('/dashboard/table/:id/confirm-order', (c) => {
        this.#confirmTableOrder(c.req.param('id'))
        return c.redirect('/dashboard')
      })
      .post('/dashboard/table/:id/clear-cart', (c) => {
        const table = this.tables.get(c.req.param('id'))
        if (table) {
          table.state.cart = []
        }
        return c.redirect('/dashboard')
      })
      .post('/dashboard/table/:id/reset-calls', (c) => {
        const table = this.tables.get(c.req.param('id'))
        if (table) {
          table.state.staffCallCount = 0
          table.state.dessertCallCount = 0
        }
        return c.redirect('/dashboard')
      })
      .post('/dashboard/menu', async (c) => {
        const form = await c.req.formData()
        const id = String(form.get('id') ?? '').trim()
        const name = String(form.get('name') ?? '').trim()
        if (id && name) {
          this.upsertMenuItem({
            id,
            name,
            price: parseNumberField(form.get('price'), 0),
            state: parseNumberField(form.get('state'), 2),
            alcohol_check: form.get('alcohol_check') === 'on' ? 1 : 0,
          })
        }
        return c.redirect('/dashboard')
      })
      .route('/saizeriya2/', this.#createSaizeriyaApp())
      .route('/saizeriya3/', this.#createSaizeriyaApp())
  }

  createNewTable(shopId: number, tableId: number) {
    const table = new Table(this, shopId, tableId)
    this.tables.set(table.id, table)
    return table
  }

  setMenuItems(items: MenuItem[]) {
    this.menuItems.clear()
    for (const item of items) {
      this.menuItems.set(item.id, item)
    }
    return this
  }

  upsertMenuItem(item: MenuItem) {
    this.menuItems.set(item.id, item)
    return this
  }

  getTable(id: string) {
    return this.tables.get(id)
  }

  #createSaizeriyaApp() {
    return new Hono()
      .get('/qr', (c) => {
        const tableId = c.req.query('table')
        const table =
          (tableId ? this.tables.get(tableId) : undefined) ??
          this.createNewTable(525, 51)
        const id = this.#createURLId(table, 'top')
        return c.redirect(`./?${id}`)
      })
      .all('/', async (c) => {
        const url = new URL(c.req.url)
        const qrTable = this.#findOrCreateTableFromQR(url)
        if (qrTable) {
          const id = this.#createURLId(qrTable, 'top')
          return c.redirect(`./?${id}`)
        }

        const requestId = url.search.slice(1)
        const table =
          this.#urlIds.get(requestId) ?? this.createNewTable(525, 51)
        let page = table.state.page

        if (c.req.method === 'POST') {
          const form = await c.req.formData()
          const data = Object.fromEntries(form.entries()) as PostedPageData
          page = data.proc ?? page
          this.#applyPostedPage(table, page, data, form)
        }

        return c.html(this.#renderPage(table, page))
      })
      .post('/src/cmd/check_order.php', async (c) => {
        const table = await this.#findTableFromForm(c.req.formData())
        return c.json({ result: table?.state.orderStarted ? 'OK' : 'NG' })
      })
      .post('/src/cmd/check_lastorder.php', async (c) => {
        const table = await this.#findTableFromForm(c.req.formData())
        return c.json({
          result: table?.state.lastOrderClosed ? 'OK' : 'NG',
          lastorder: table?.state.lastOrderClosed ?? false,
        })
      })
      .post('/src/cmd/check_midnight.php', async (c) => {
        const table = await this.#findTableFromForm(c.req.formData())
        return c.json({ result: table?.state.midnightCharge ? 'OK' : 'NG' })
      })
      .post('/src/cmd/put_alcohol.php', (c) => {
        return c.json({ result: 'OK' })
      })
      .post('/src/cmd/tbl_call.php', async (c) => {
        const form = await c.req.formData()
        const table = this.#findTableByShopAndTable(
          form.get('sid'),
          form.get('tbl'),
        )
        const after = String(form.get('aft')) === 'true'
        if (table) {
          if (after) {
            table.state.dessertCallCount++
          } else {
            table.state.staffCallCount++
          }
        }
        return c.json({ result: 'OK' })
      })
      .post('/src/cmd/get_item.php', async (c) => {
        const form = await c.req.formData()
        const id = String(form.get('id') ?? '')
        const item = this.menuItems.get(id)

        if (!item) {
          return json({ result: 'NG' })
        }

        return json({
          result: 'OK',
          alcohol_check: item.alcohol_check ?? 0,
          item_data: {
            id,
            name: item.name,
            price: item.price,
            messages: item.messages ?? ['0', '2'],
            mod_id: item.mod_id ?? '',
            mod_name: item.mod_name ?? '',
            mod_price: item.mod_price ?? 0,
            mod_ini_cnt: item.mod_ini_cnt ?? 0,
            mod_guid: item.mod_guid ?? '',
            drk_id: item.drk_id ?? '',
            drk_name: item.drk_name ?? '',
            drk_price: item.drk_price ?? 0,
            drk_guid: item.drk_guid ?? '',
            popup: item.popup ?? '',
            notice: item.notice ?? '',
            arc_type: item.arc_type ?? 0,
            drk_type: item.drk_type ?? 0,
            main_type: item.main_type ?? 0,
            state: item.state ?? 2,
          },
        })
      })
      .get('/data/:path{.+}', async (c) => {
        const path = c.req.param('path')
        if (path.includes('..')) {
          return c.text('Invalid path', 400)
        }
        const file = assetFile(`data/${path}`)
        if (!(await file.exists())) {
          return c.text('File not found', 404)
        }
        return c.body(file.stream())
      })
  }

  #findOrCreateTableFromQR(url: URL) {
    if (!url.searchParams.has('SN') && !url.searchParams.has('TN')) {
      return
    }

    const shopId = Number.parseInt(url.searchParams.get('SN') ?? '525', 10)
    const tableId = Number.parseInt(url.searchParams.get('TB') ?? '51', 10)
    const existing = this.#findTableByShopAndTable(shopId, tableId)
    return existing ?? this.createNewTable(shopId, tableId)
  }

  async #findTableFromForm(formPromise: Promise<FormData>) {
    const form = await formPromise
    return this.#findTableByShopAndTable(
      form.get('sid'),
      form.get('tno') ?? form.get('tbl'),
    )
  }

  #findTableByShopAndTable(shopIdSource: unknown, tableIdSource: unknown) {
    const shopId = Number.parseInt(String(shopIdSource ?? ''), 10)
    const tableId = Number.parseInt(String(tableIdSource ?? ''), 10)
    return [...this.tables.values()].find(
      (table) =>
        table.state.shopId === shopId && table.state.tableId === tableId,
    )
  }

  #createURLId(table: Table, page: Page) {
    const id = crypto.randomUUID()
    table.state.page = page
    this.#urlIds.set(id, table)
    return id
  }

  #applyPostedPage(
    table: Table,
    page: Page,
    data: PostedPageData,
    form: FormData,
  ) {
    table.state.page = page
    table.state.token = `${crypto.randomUUID()}.${Math.random().toString().slice(2)}`

    if (page === 'menu' && data.ctrl === 'number' && data.number) {
      table.state.peopleCount = Number.parseInt(data.number, 10)
    }

    if (page === 'main' && data.ctrl === 'add' && data.code) {
      table.state.orderStarted = true
      table.state.cart.push({
        id: data.code,
        count: Number.parseInt(data.amount ?? '1', 10),
        reorder: 0,
        modId: data.mod_code ?? '',
        modCount: data.mod_amount ? Number.parseInt(data.mod_amount, 10) : '',
      })
    }

    if (page === 'order') {
      this.#confirmTableOrder(table.id, this.#cartFromOrderForm(form))
    }

    if (page === 'receipt') {
      table.state.receiptShown = true
    }
  }

  #confirmTableOrder(tableId: string, order?: CartLine[]) {
    const table = this.tables.get(tableId)
    if (!table) {
      return
    }

    const submitted =
      order && order.length > 0 ? order : cloneCart(table.state.cart)
    if (submitted.length > 0) {
      table.state.submittedOrders.push(submitted)
    }
    table.state.cart = []
    table.state.orderStarted = true
    table.state.page = 'call'
  }

  #cartFromOrderForm(form: FormData) {
    const ids = form.getAll('item[id][]').map(toId)
    const counts = form.getAll('item[count][]').map(toId)
    const reorders = form.getAll('item[reorder][]').map(toId)
    const modIds = form.getAll('item[mod_id][]').map(toId)
    const modCounts = form.getAll('item[mod_count][]').map(toId)

    return ids.map<CartLine>((id, index) => ({
      id,
      count: Number.parseInt(counts[index] ?? '1', 10),
      reorder: reorders[index] === '1' ? 1 : 0,
      modId: modIds[index] ?? '',
      modCount: modCounts[index] ? Number.parseInt(modCounts[index], 10) : '',
    }))
  }

  #renderPage(table: Table, page: Page) {
    const renderPage = page === 'order' ? 'call' : page
    const nextId = this.#createURLId(table, renderPage)
    const html = String(pageComponents[renderPage]())
    return this.#rewriteHTMLForTable(html, table, nextId)
  }

  #rewriteHTMLForTable(html: string, table: Table, nextId: string) {
    let rewritten = html
      .replace(/action="\.\/\?[^"]*"/g, `action="./?${nextId}"`)
      .replace(/data-shop="[^"]*"/g, `data-shop="${table.state.shopId}"`)
      .replace(/data-tbl="[^"]*"/g, `data-tbl="${table.state.tableId}"`)

    rewritten = setInputValue(
      rewritten,
      'shop-id',
      table.state.shopId.toString(),
    )
    rewritten = setInputValue(
      rewritten,
      'table-no',
      table.state.tableId.toString(),
    )
    rewritten = setInputValue(rewritten, 'session-id', table.state.sessionId)
    rewritten = setInputValue(
      rewritten,
      'number',
      table.state.peopleCount.toString(),
    )
    rewritten = setNamedInputValue(rewritten, 'token', table.state.token)

    if (rewritten.includes('history-page')) {
      rewritten = this.#rewriteOrderList(rewritten, table, 'history')
    }
    if (rewritten.includes('main-page')) {
      rewritten = this.#rewriteMainCart(rewritten, table)
    }
    if (rewritten.includes('account-page')) {
      rewritten = this.#rewriteOrderList(rewritten, table, 'account')
    }
    if (rewritten.includes('receipt-page')) {
      rewritten = this.#rewriteReceipt(rewritten, table)
    }

    return rewritten
  }

  #createReceiptBarcode(table: Table) {
    const control = table.state.sessionId
      .split('')
      .map((char) => char.charCodeAt(0) % 10)
      .join('')
      .slice(0, 6)
      .padEnd(6, '0')
    return `${table.state.shopId.toString().padStart(3, '0')}${table.state.tableId
      .toString()
      .padStart(3, '0')}${control}`.slice(0, 12)
  }

  #buildOrderDisplayLines(items: CartLine[]) {
    const lines = new Map<string, OrderDisplayLine>()

    for (const item of items) {
      const menuItem = this.menuItems.get(item.id)
      const modifier = item.modId ? this.menuItems.get(item.modId) : undefined
      const modCount =
        typeof item.modCount === 'number' && Number.isFinite(item.modCount)
          ? item.modCount
          : 0
      const unitPrice =
        (menuItem?.price ?? 0) + (modifier ? modifier.price * modCount : 0)
      const name = [menuItem?.name ?? item.id, modifier?.name]
        .filter(Boolean)
        .join(' ')
      const key = `${item.id}:${item.modId}:${modCount}`
      const current = lines.get(key)

      if (current) {
        current.count += item.count
        current.price += unitPrice * item.count
      } else {
        lines.set(key, {
          id: item.id,
          name,
          count: item.count,
          price: unitPrice * item.count,
          modId: item.modId,
          modCount,
          reorder: item.reorder,
        })
      }
    }

    return [...lines.values()]
  }

  #getSubmittedOrderLines(table: Table) {
    return this.#buildOrderDisplayLines(table.state.submittedOrders.flat())
  }

  #getCartOrderLines(table: Table) {
    return this.#buildOrderDisplayLines(table.state.cart)
  }

  #rewriteMainCart(html: string, table: Table) {
    const lines = this.#getCartOrderLines(table)
    const count = lines.reduce((sum, line) => sum + line.count, 0)
    const total = lines.reduce((sum, line) => sum + line.price, 0)
    const rows = lines
      .map(
        (line) =>
          `<tr><td>${escapeHTML(line.name)}</td><td>${escapeHTML(line.count)}</td><td>${escapeHTML(formatAmount(line.price))}</td></tr>`,
      )
      .join('')
    const hiddenFields = table.state.cart
      .map(
        (item) =>
          `<input type="hidden" name="item[id][]" value="${escapeHTML(item.id)}" /><input type="hidden" name="item[count][]" value="${escapeHTML(item.count)}" /><input type="hidden" name="item[reorder][]" value="${escapeHTML(item.reorder)}" /><input type="hidden" name="item[mod_id][]" value="${escapeHTML(item.modId)}" /><input type="hidden" name="item[mod_count][]" value="${escapeHTML(item.modCount)}" />`,
      )
      .join('')

    return html
      .replace(
        /(<input type="hidden" id="is-first-order" value="YES" \/>)/,
        `$1${hiddenFields}`,
      )
      .replace(
        /(<div class="list-base"[^>]*>\s*<div class="list"[^>]*>\s*<table>\s*<tbody>)[\s\S]*?(<\/tbody>)/,
        `$1${rows}$2`,
      )
      .replace(
        /(<p class="count">\s*<span>)[\s\S]*?(<\/span>点<\/p>)/,
        `$1${count}$2`,
      )
      .replace(
        /(<p class="amount">[\s\S]*?合計(?:&nbsp;|\s|\u00a0)*<span>)[\s\S]*?(<\/span>\s*円 \(税込\)\s*<\/p>)/,
        `$1${formatAmount(total)}$2`,
      )
  }

  #rewriteOrderList(html: string, table: Table, page: 'account' | 'history') {
    const lines = this.#getSubmittedOrderLines(table)
    const count = lines.reduce((sum, line) => sum + line.count, 0)
    const total = lines.reduce((sum, line) => sum + line.price, 0)
    const rows = lines
      .map((line) =>
        page === 'history'
          ? `<tr><td>${escapeHTML(line.name)}</td><td>${escapeHTML(line.count)}</td><td>${escapeHTML(formatAmount(line.price))}</td><td><div class="reorder red" data-id="${escapeHTML(line.id)}">再注文</div></td></tr>`
          : `<tr><td>${escapeHTML(line.name)}</td><td>${escapeHTML(line.count)}</td><td>${escapeHTML(formatAmount(line.price))}</td></tr>`,
      )
      .join('')

    return html
      .replace(
        /(<div class="list"[^>]*>\s*<table>\s*<tbody>)[\s\S]*?(<\/tbody>)/,
        `$1${rows}$2`,
      )
      .replace(
        /(<p class="count">\s*<span>)[\s\S]*?(<\/span>点<\/p>)/,
        `$1${count}$2`,
      )
      .replace(
        /(<p class="amount">[\s\S]*?合計(?:&nbsp;|\s|\u00a0)*<span>)[\s\S]*?(<\/span>\s*円 \(税込\)\s*<\/p>)/,
        `$1${formatAmount(total)}$2`,
      )
  }

  #rewriteReceipt(html: string, table: Table) {
    const barcode = this.#createReceiptBarcode(table)
    return html
      .replace(
        /(<p class="table">)[\s\S]*?(<\/p>)/,
        `$1${escapeHTML(table.state.tableId)}$2`,
      )
      .replace(
        /(<div class="barcode">\s*<img[\s\S]*?\/>\s*<p>)[\s\S]*?(<\/p>)/,
        `$1${escapeHTML(barcode)}$2`,
      )
  }

  #renderDashboard() {
    const pageOptions = [
      'top',
      'number',
      'menu',
      'main',
      'call',
      'account',
      'receipt',
    ] satisfies Page[]

    const tableRows = [...this.tables.values()]
      .map((table) => {
        const state = table.state
        const cart = state.cart
          .map((item) => `${escapeHTML(item.id)} x ${escapeHTML(item.count)}`)
          .join('<br>')
        const orders = state.submittedOrders
          .map(
            (order, index) =>
              `#${index + 1}: ${order
                .map(
                  (item) =>
                    `${escapeHTML(item.id)} x ${escapeHTML(item.count)}`,
                )
                .join(', ')}`,
          )
          .join('<br>')

        return `
          <section class="panel">
            <div class="head">
              <h2>Table ${escapeHTML(state.tableId)}</h2>
              <a href="${escapeHTML(table.createQRCodeURL('', '/saizeriya3'))}">QR URL</a>
            </div>
            <p>shop ${escapeHTML(state.shopId)} / table id ${escapeHTML(table.id)}</p>
            <form method="post" action="/dashboard/table/${escapeHTML(table.id)}" class="grid">
              <label>people <input name="peopleCount" type="number" min="1" value="${escapeHTML(state.peopleCount)}"></label>
              <label>page
                <select name="page">
                  ${pageOptions
                    .map(
                      (page) =>
                        `<option value="${page}"${page === state.page ? ' selected' : ''}>${page}</option>`,
                    )
                    .join('')}
                </select>
              </label>
              <label><input name="orderStarted" type="checkbox"${checked(state.orderStarted)}> order started</label>
              <label><input name="lastOrderClosed" type="checkbox"${checked(state.lastOrderClosed)}> last order closed</label>
              <label><input name="midnightCharge" type="checkbox"${checked(state.midnightCharge)}> midnight charge</label>
              <button type="submit">Update</button>
            </form>
            <div class="split">
              <div><strong>Cart</strong><p>${cart || 'empty'}</p></div>
              <div><strong>Submitted</strong><p>${orders || 'none'}</p></div>
              <div><strong>Calls</strong><p>staff ${escapeHTML(state.staffCallCount)} / dessert ${escapeHTML(state.dessertCallCount)}</p></div>
            </div>
            <form method="post" action="/dashboard/table/${escapeHTML(table.id)}/confirm-order">
              <button type="submit">Confirm current order</button>
            </form>
            <form method="post" action="/dashboard/table/${escapeHTML(table.id)}/clear-cart">
              <button type="submit">Clear cart</button>
            </form>
            <form method="post" action="/dashboard/table/${escapeHTML(table.id)}/reset-calls">
              <button type="submit">Reset calls</button>
            </form>
          </section>
        `
      })
      .join('')

    const menuRows = [...this.menuItems.values()]
      .map(
        (item) =>
          `<tr><td>${escapeHTML(item.id)}</td><td>${escapeHTML(item.name)}</td><td>${escapeHTML(item.price)}</td><td>${escapeHTML(item.state ?? 2)}</td><td>${escapeHTML(item.alcohol_check ?? 0)}</td></tr>`,
      )
      .join('')

    return `<!doctype html>
      <html lang="ja">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Mock Server Dashboard</title>
          <style>
            body { font-family: system-ui, sans-serif; margin: 24px; color: #1d1d1f; background: #f7f7f5; }
            h1 { margin: 0 0 16px; font-size: 28px; }
            h2 { margin: 0; font-size: 18px; }
            form { margin: 8px 0; }
            button, input, select { font: inherit; padding: 6px 8px; }
            button { cursor: pointer; }
            table { width: 100%; border-collapse: collapse; background: white; }
            th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; }
            .panel { background: white; border: 1px solid #ddd; border-radius: 6px; padding: 16px; margin: 16px 0; }
            .head { display: flex; justify-content: space-between; gap: 16px; align-items: baseline; }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; align-items: end; }
            .split { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 12px 0; }
            .inline { display: flex; gap: 8px; flex-wrap: wrap; align-items: end; }
          </style>
        </head>
        <body>
          <h1>Mock Server Dashboard</h1>
          <section class="panel">
            <h2>Create table</h2>
            <form method="post" action="/dashboard/tables" class="inline">
              <label>shop <input name="shopId" type="number" value="525"></label>
              <label>table <input name="tableId" type="number" value="51"></label>
              <button type="submit">Create</button>
            </form>
          </section>
          ${tableRows || '<section class="panel">No tables yet.</section>'}
          <section class="panel">
            <h2>Menu injection</h2>
            <form method="post" action="/dashboard/menu" class="inline">
              <label>id <input name="id" required></label>
              <label>name <input name="name" required></label>
              <label>price <input name="price" type="number" value="0"></label>
              <label>state <input name="state" type="number" value="2"></label>
              <label><input name="alcohol_check" type="checkbox"> alcohol</label>
              <button type="submit">Upsert</button>
            </form>
            <table>
              <thead><tr><th>ID</th><th>Name</th><th>Price</th><th>State</th><th>Alcohol</th></tr></thead>
              <tbody>${menuRows}</tbody>
            </table>
          </section>
        </body>
      </html>`
  }
}

const server = new Server()

export default server.app
