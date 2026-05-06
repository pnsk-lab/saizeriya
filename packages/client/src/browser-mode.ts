import { existsSync } from 'node:fs'
import { delimiter, join } from 'node:path'
import type { BrowserContextOptions, LaunchOptions } from 'playwright'
import type {
  AccountSummary,
  AddItemOptions,
  CallOptions,
  CartItem,
  ClientState,
  LookupItemResult,
  ReceiptSummary,
} from './types'
import { PageParser } from './utils/page-parser'
import { createQueueLocker } from './utils/queue-locker'

type BrowserPageKind = ClientState['pageKind']

interface LocatorLike {
  click(options?: { timeout?: number }): Promise<void>
  count(): Promise<number>
  fill(value: string, options?: { timeout?: number }): Promise<void>
  first(): LocatorLike
  getAttribute(name: string, options?: { timeout?: number }): Promise<string | null>
  inputValue(options?: { timeout?: number }): Promise<string>
  isVisible(options?: { timeout?: number }): Promise<boolean>
  last(): LocatorLike
  locator(selector: string): LocatorLike
  nth(index: number): LocatorLike
  textContent(options?: { timeout?: number }): Promise<string | null>
}

export interface BrowserPageLike {
  content(): Promise<string>
  goto(
    url: string,
    options?: { waitUntil?: 'domcontentloaded' | 'load' | 'networkidle' },
  ): Promise<unknown>
  locator(selector: string): LocatorLike
  waitForFunction<R, Arg = unknown>(
    pageFunction: string | ((arg: Arg) => R),
    arg?: Arg,
    options?: { timeout?: number },
  ): Promise<unknown>
  evaluate<R, Arg = unknown>(pageFunction: string | ((arg: Arg) => R), arg?: Arg): Promise<R>
  waitForLoadState(
    state?: 'domcontentloaded' | 'load' | 'networkidle',
    options?: { timeout?: number },
  ): Promise<void>
  url(): string
  waitForTimeout(timeout: number): Promise<void>
}

interface BrowserContextLike {
  newPage(): Promise<BrowserPageLike>
  close(): Promise<void>
}

interface BrowserLike {
  newContext(options?: BrowserContextOptions): Promise<BrowserContextLike>
  close(): Promise<void>
}

export interface BrowserClientInit {
  qrURLSource: string
  peopleCount?: number
  page?: BrowserPageLike
  browser?: BrowserLike
  launchOptions?: LaunchOptions
  contextOptions?: BrowserContextOptions
}

export interface BrowserClient {
  getState(): ClientState
  getPage(): BrowserPageLike
  close(): Promise<void>
  setPeopleCount(count: number): Promise<ClientState>
  lookupItem(code: string): Promise<LookupItemResult>
  addItem(code: string, options?: AddItemOptions): Promise<ClientState>
  submitOrder(): Promise<ClientState>
  goToMenu(): Promise<ClientState>
  goToCart(): Promise<ClientState>
  goToHistory(): Promise<ClientState>
  goToAccount(): Promise<ClientState>
  getAccount(): Promise<{ state: ClientState; account: AccountSummary }>
  showReceipt(): Promise<ClientState>
  getReceipt(): Promise<{
    state: ClientState
    account: AccountSummary
    receipt: ReceiptSummary
  }>
  reorder(code: string): Promise<ClientState>
  removeCartItem(index: number): Promise<ClientState>
  call(options?: CallOptions): Promise<{ result: string }>
  callStaff(): Promise<{ result: string }>
  callDessert(): Promise<{ result: string }>
}

const loadPlaywright = async () => {
  try {
    return (await import('playwright')) as {
      chromium: {
        launch(options?: LaunchOptions): Promise<BrowserLike>
      }
    }
  } catch (error) {
    throw new Error(
      'Browser mode requires the optional "playwright" dependency. Install it with `npm i playwright` or enable saizeriya.js optional dependencies.',
      { cause: error },
    )
  }
}

const getEnv = (name: string) =>
  typeof process !== 'undefined' ? process.env[name]?.trim() : undefined

const executableNames = [
  'google-chrome-stable',
  'google-chrome',
  'chrome',
  'chromium',
  'chromium-browser',
] as const

const executablePathCandidates = () => {
  const home = getEnv('HOME')
  const user = getEnv('USER')
  return [
    getEnv('CHROME_EXECUTABLE'),
    getEnv('PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'),
    getEnv('PUPPETEER_EXECUTABLE_PATH'),
    ...executableNames.flatMap((name) =>
      (getEnv('PATH') ?? '')
        .split(delimiter)
        .filter(Boolean)
        .map((dir) => join(dir, name)),
    ),
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/opt/google/chrome/chrome',
    '/opt/chromium/chrome',
    '/run/current-system/sw/bin/google-chrome-stable',
    '/run/current-system/sw/bin/google-chrome',
    '/run/current-system/sw/bin/chromium',
    '/run/current-system/sw/bin/chromium-browser',
    '/nix/var/nix/profiles/default/bin/google-chrome-stable',
    '/nix/var/nix/profiles/default/bin/google-chrome',
    '/nix/var/nix/profiles/default/bin/chromium',
    '/nix/var/nix/profiles/default/bin/chromium-browser',
    home ? `${home}/.nix-profile/bin/google-chrome-stable` : undefined,
    home ? `${home}/.nix-profile/bin/google-chrome` : undefined,
    home ? `${home}/.nix-profile/bin/chromium` : undefined,
    home ? `${home}/.nix-profile/bin/chromium-browser` : undefined,
    user ? `/etc/profiles/per-user/${user}/bin/google-chrome-stable` : undefined,
    user ? `/etc/profiles/per-user/${user}/bin/google-chrome` : undefined,
    user ? `/etc/profiles/per-user/${user}/bin/chromium` : undefined,
    user ? `/etc/profiles/per-user/${user}/bin/chromium-browser` : undefined,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ]
}

export const findChromeExecutable = () => {
  const explicitExecutable = getEnv('CHROME_EXECUTABLE')
  if (explicitExecutable) {
    return explicitExecutable
  }

  const seen = new Set<string>()
  for (const candidate of executablePathCandidates()) {
    if (!candidate || seen.has(candidate)) {
      continue
    }
    seen.add(candidate)
    if (existsSync(candidate)) {
      return candidate
    }
  }
}

export const createBrowserLaunchOptions = (options: LaunchOptions = {}): LaunchOptions => {
  const executablePath = options.executablePath ?? findChromeExecutable()
  return {
    headless: false,
    ...options,
    ...(executablePath ? { executablePath } : {}),
  }
}

const assertItemCode = (code: string) => {
  if (!/^\d{4}$/.test(code)) {
    throw new Error('Item code must be 4 digits')
  }
}

const assertCount = (count: number, label: string, min = 1) => {
  if (!Number.isInteger(count) || count < min || count > 99) {
    throw new Error(`${label} must be an integer between ${min} and 99`)
  }
}

const textNumber = (value: string | null | undefined) =>
  Number.parseInt(String(value ?? '0').replace(/[^\d-]/g, ''), 10)

const normalizePrice = (value: string | null | undefined) =>
  Number.parseInt(String(value ?? '0').replace(/[^\d-]/g, ''), 10)

const isChangingContentError = (error: unknown) =>
  error instanceof Error &&
  /page is navigating|changing the content|Unable to retrieve content/i.test(error.message)

const formatOrderTime = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())},${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export const createBrowserClient = async ({
  qrURLSource,
  peopleCount,
  page: providedPage,
  browser: providedBrowser,
  launchOptions,
  contextOptions,
}: BrowserClientInit): Promise<BrowserClient> => {
  const owned: { browser?: BrowserLike; context?: BrowserContextLike } = {}
  let page = providedPage

  if (!page) {
    const browser =
      providedBrowser ??
      (await (await loadPlaywright()).chromium.launch(createBrowserLaunchOptions(launchOptions)))
    const context = await browser.newContext(contextOptions)
    owned.browser = providedBrowser ? undefined : browser
    owned.context = context
    page = await context.newPage()
  }

  const locker = createQueueLocker()
  const state: ClientState = {
    baseURL: '',
    nextId: '',
    shopId: 0,
    tableNo: 0,
    peopleCount: peopleCount ?? 0,
    pageKind: 'unknown',
    cart: [],
  }

  const readPageContent = async () => {
    let lastError: unknown
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        return await page.content()
      } catch (error) {
        if (!isChangingContentError(error)) {
          throw error
        }
        lastError = error
        await page.waitForLoadState('domcontentloaded', { timeout: 2000 }).catch(() => {})
        await page.waitForTimeout(100)
      }
    }
    throw lastError
  }

  const parser = async () => new PageParser(await readPageContent())

  const updateFromParser = (parsed: PageParser) => {
    state.nextId = parsed.getNextActionId()
    state.baseURL = state.baseURL || ''
    state.shopId = parsed.getShopId()
    state.tableNo = parsed.getTableNo()
    state.token = parsed.getToken() ?? state.token
    state.sessionId = parsed.getSessionId() ?? state.sessionId
    state.pageKind = parsed.getPageKind()
    state.peopleCount = parsed.getPeopleCount() ?? state.peopleCount
  }

  const refreshState = async () => {
    const parsed = await parser()
    updateFromParser(parsed)
    if (state.pageKind === 'main') {
      state.cart = await readVisibleCart()
    }
    return parsed
  }

  const dialogButtonSelector =
    '#base-overlay .ui-dialog-buttonset button, .ui-dialog-buttonset button, .ui-dialog-buttonpane button, [role="dialog"] button'

  const waitForReady = async () => {
    await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {})
    await page.waitForLoadState('networkidle', { timeout: 1000 }).catch(() => {})
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await refreshState()
        return
      } catch (error) {
        if (!isChangingContentError(error)) {
          throw error
        }
        await page.waitForTimeout(100)
      }
    }
    await refreshState()
  }

  const submitForm = async (values: Record<string, string | number | boolean>) => {
    await page.evaluate((fields) => {
      const form = document.querySelector<HTMLFormElement>('#frm_ctrl')
      if (!form) {
        throw new Error('Control form was not found')
      }
      for (const [key, rawValue] of Object.entries(fields)) {
        const value = String(rawValue)
        let input = form.querySelector<HTMLInputElement>(`#${CSS.escape(key)}`)
        input ??= form.querySelector<HTMLInputElement>(`input[name="${CSS.escape(key)}"]`)
        if (!input) {
          input = document.createElement('input')
          input.type = 'hidden'
          input.id = key
          input.name = key
          form.append(input)
        }
        input.value = value
      }
      form.requestSubmit()
    }, values)
    await waitForReady()
  }

  const click = async (selector: string, timeout = 5000) => {
    const before = state.nextId
    await page.locator(selector).click({ timeout })
    await page
      .waitForFunction(
        ({ previousAction }) => {
          const form = document.querySelector<HTMLFormElement>('#frm_ctrl')
          const action = form?.getAttribute('action') ?? ''
          const dialog = document.querySelector(
            '#base-overlay .ui-dialog-buttonset button, .ui-dialog-buttonset button, .ui-dialog-buttonpane button, [role="dialog"] button',
          )
          return Boolean(dialog || (action && action !== previousAction))
        },
        { previousAction: `./?${before}` },
        { timeout: 1500 },
      )
      .catch(() => {})
    await waitForReady()
  }

  const findVisibleDialogButton = async (timeout = 2500) => {
    const startedAt = Date.now()
    while (Date.now() - startedAt <= timeout) {
      const buttons = page.locator(dialogButtonSelector)
      const count = await buttons.count().catch(() => 0)
      for (let index = count - 1; index >= 0; index--) {
        const button = buttons.nth(index)
        if (await button.isVisible({ timeout: 100 }).catch(() => false)) {
          return button
        }
      }
      await page.waitForTimeout(50)
    }
  }

  const hasVisibleDialog = async () => Boolean(await findVisibleDialogButton(150))

  const acceptDialog = async (timeout = 2500) => {
    const button = await findVisibleDialogButton(timeout)
    if (!button) {
      return false
    }
    await button.click()
    await page.waitForTimeout(50)
    await waitForReady()
    return true
  }

  const ensurePage = async (kind: BrowserPageKind) => {
    await refreshState()
    if (state.pageKind === kind) {
      return
    }

    if (kind === 'menu') {
      if (state.pageKind === 'top' || state.pageKind === 'entry') {
        await submitForm({ proc: 'number' })
      }
      if (state.pageKind === 'number') {
        await choosePeople(state.peopleCount || 2)
      }
      if (state.pageKind !== 'menu') {
        await submitForm({ proc: 'menu' })
      }
      return
    }

    if (kind === 'main') {
      await submitForm({ proc: 'main' })
      return
    }

    if (kind === 'history') {
      await submitForm({ proc: 'history' })
      return
    }

    if (kind === 'account') {
      await submitForm({ proc: 'account' })
      return
    }

    if (kind === 'call') {
      await submitForm({ proc: 'call' })
      return
    }

    if (kind === 'number') {
      await submitForm({ proc: 'number' })
    }
  }

  const choosePeople = async (count: number) => {
    assertCount(count, 'People count')
    await ensurePage('number')
    await submitForm({ number: count, proc: 'menu', ctrl: 'number' })
    state.peopleCount = count
  }

  const clearEnteredCode = async () => {
    for (let index = 0; index < 4; index++) {
      await page
        .locator('.tenkey .del')
        .click({ timeout: 1000 })
        .catch(() => {})
    }
    await page.waitForTimeout(50)
  }

  const enterCodeByClicks = async (code: string) => {
    await ensurePage('menu')
    await clearEnteredCode()
    for (const digit of code) {
      await page.locator(`.tenkey li[data-val="${digit}"]`).click()
      await page.waitForTimeout(50)
    }
    await page
      .waitForFunction(
        (target) => {
          const input = document.querySelector<HTMLInputElement>('.detail .main #code')
          const overlay = document.querySelector('#base-overlay')
          return input?.value === target || Boolean(overlay)
        },
        code,
        { timeout: 5000 },
      )
      .catch(() => {})
  }

  const readLookupFromDom = async (code: string): Promise<LookupItemResult> => {
    if (await hasVisibleDialog()) {
      await acceptDialog()
    }

    const resolvedCode = await page
      .locator('.detail .main #code')
      .inputValue({ timeout: 500 })
      .catch(() => '')
    if (resolvedCode !== code) {
      return { result: 'NG' }
    }

    const name = (await page.locator('.detail .main .name dt').textContent())?.trim() ?? ''
    const price = normalizePrice(await page.locator('.detail .main .name dd').textContent())
    const modId = await page
      .locator('.detail .mod #mod_code')
      .inputValue({ timeout: 500 })
      .catch(() => '')
    const modName =
      (
        await page
          .locator('.detail .mod .name dt')
          .textContent({ timeout: 500 })
          .catch(() => '')
      )?.trim() ?? ''
    const modPrice = normalizePrice(
      await page
        .locator('.detail .mod .name dd')
        .textContent({ timeout: 500 })
        .catch(() => '0'),
    )
    const modIniCount = textNumber(
      await page
        .locator('.detail .mod #mod_amount')
        .inputValue({ timeout: 500 })
        .catch(() => '0'),
    )
    const notice =
      (
        await page
          .locator('.notice-balloon .msg-base span')
          .textContent({ timeout: 500 })
          .catch(() => '')
      )?.trim() ?? ''
    const modGuid =
      (
        await page
          .locator('.detail .mod #guide .msg-base span')
          .textContent({ timeout: 500 })
          .catch(() => '')
      )?.trim() ?? ''

    return {
      result: 'OK',
      alcohol_check: 0,
      item_data: {
        id: code,
        name,
        price,
        messages: [],
        mod_id: modId,
        mod_name: modName === '\u00a0' ? '' : modName,
        mod_price: Number.isFinite(modPrice) ? modPrice : 0,
        mod_ini_cnt: Number.isFinite(modIniCount) ? modIniCount : 0,
        mod_guid: modGuid,
        drk_id: '',
        drk_name: '',
        drk_price: 0,
        drk_guid: '',
        popup: '',
        notice,
        arc_type: 0,
        drk_type: 0,
        main_type: 0,
        state: 2,
      },
    }
  }

  const setQuantity = async (selectorRoot: string, target: number, min: number) => {
    assertCount(target, 'Quantity', min)
    await page.evaluate(
      ({ selector, value }) => {
        const input = document.querySelector<HTMLInputElement>(`${selector} input`)
        if (!input) {
          throw new Error(`Quantity input was not found: ${selector}`)
        }
        input.value = String(value)
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input.dispatchEvent(new Event('change', { bubbles: true }))
      },
      { selector: selectorRoot, value: target },
    )
  }

  const readVisibleCart = async (): Promise<CartItem[]> => {
    const rows = page.locator('#body-section div.list table tbody tr')
    const rowCount = await rows.count()
    const items: CartItem[] = []
    for (let index = 0; index < rowCount; index++) {
      const row = rows.nth(index)
      const id = await row
        .locator('input[name="item[id][]"]')
        .inputValue({ timeout: 500 })
        .catch(() => '')
      const count = textNumber(
        await row
          .locator('input[name="item[count][]"]')
          .inputValue({ timeout: 500 })
          .catch(() => row.locator('td').nth(1).textContent({ timeout: 500 })),
      )
      const modId = await row
        .locator('input[name="item[mod_id][]"]')
        .inputValue({ timeout: 500 })
        .catch(() => '')
      const rawModCount = await row
        .locator('input[name="item[mod_count][]"]')
        .inputValue({ timeout: 500 })
        .catch(() => '')
      const reorderValue = await row
        .locator('input[name="item[reorder][]"]')
        .inputValue({ timeout: 500 })
        .catch(() => '0')
      items.push({
        id,
        name: (
          await row
            .locator('td')
            .nth(0)
            .textContent({ timeout: 500 })
            .catch(() => '')
        )?.trim(),
        price: normalizePrice(
          await row
            .locator('td')
            .nth(2)
            .textContent({ timeout: 500 })
            .catch(() => '0'),
        ),
        count,
        reorder: reorderValue === '1' ? 1 : 0,
        modId,
        modCount: rawModCount ? textNumber(rawModCount) : '',
      })
    }
    return items
  }

  await page.goto(qrURLSource, { waitUntil: 'domcontentloaded' })
  await waitForReady()
  const formAction = await page.locator('#frm_ctrl').getAttribute('action')
  state.baseURL = new URL(formAction ?? './', page.url()).toString().replace(/\?.*$/, '')

  const setPeopleCount = async (count: number) =>
    await locker(async () => {
      await choosePeople(count)
      return getState()
    })

  const lookupItem = async (code: string) =>
    await locker(async () => {
      assertItemCode(code)
      await enterCodeByClicks(code)
      return await readLookupFromDom(code)
    })

  const addItem = async (code: string, options: AddItemOptions = {}) =>
    await locker(async () => {
      assertItemCode(code)
      const count = options.count ?? 1
      const modCount = options.modCount ?? 0
      assertCount(count, 'Item count')

      await enterCodeByClicks(code)
      const lookup = await readLookupFromDom(code)
      if (lookup.result !== 'OK' || !lookup.item_data) {
        throw new Error(`Item ${code} was not found`)
      }

      await setQuantity('.detail .main .amount', count, 1)
      if (options.modCount !== undefined) {
        await setQuantity('.detail .mod .amount', modCount, 0)
      }
      await submitForm({
        proc: 'main',
        ctrl: 'add',
        'order-time': formatOrderTime(new Date()),
      })

      state.cart = await readVisibleCart()
      if (!state.cart.some((item) => item.id === code)) {
        state.cart.push({
          id: code,
          name: lookup.item_data.name,
          price: lookup.item_data.price,
          count,
          reorder: options.reorder ? 1 : 0,
          modId: options.modId ?? lookup.item_data.mod_id ?? '',
          modCount: options.modCount ?? lookup.item_data.mod_ini_cnt ?? '',
        })
      }
      return getState()
    })

  const submitOrder = async () =>
    await locker(async () => {
      await ensurePage('main')
      if ((await readVisibleCart()).length === 0) {
        throw new Error('Cannot submit an empty cart')
      }
      await submitForm({ proc: 'order' })
      state.cart = []
      return getState()
    })

  const goToMenu = async () =>
    await locker(async () => {
      await ensurePage('menu')
      return getState()
    })

  const goToCart = async () =>
    await locker(async () => {
      await ensurePage('main')
      return getState()
    })

  const goToHistory = async () =>
    await locker(async () => {
      await ensurePage('history')
      return getState()
    })

  const goToAccount = async () =>
    await locker(async () => {
      await ensurePage('account')
      return getState()
    })

  const getAccount = async () =>
    await locker(async () => {
      await ensurePage('account')
      const parsed = await parser()
      return { state: getState(), account: parsed.getAccountSummary() }
    })

  const showReceiptUnlocked = async () => {
    await ensurePage('account')
    await submitForm({ proc: 'receipt' })
    return getState()
  }

  const showReceipt = async () => await locker(showReceiptUnlocked)

  const getReceipt = async () =>
    await locker(async () => {
      await showReceiptUnlocked()
      const parsed = await parser()
      return {
        state: getState(),
        account: parsed.getAccountSummary(),
        receipt: parsed.getReceiptSummary(),
      }
    })

  const reorder = async (code: string) =>
    await locker(async () => {
      assertItemCode(code)
      await ensurePage('history')
      await submitForm({ code, proc: 'menu', ctrl: 'reorder' })
      return getState()
    })

  const removeCartItem = async (index: number) =>
    await locker(async () => {
      await ensurePage('main')
      if (!Number.isInteger(index) || index < 0) {
        throw new Error('Cart item was not found')
      }
      const rows = page.locator('#body-section div.list table tbody tr')
      if ((await rows.count()) <= index) {
        throw new Error('Cart item was not found')
      }
      await page.evaluate((rowIndex) => {
        const rows = document.querySelectorAll('#body-section div.list table tbody tr')
        rows.item(rowIndex)?.remove()
        const remainingRows = document.querySelectorAll('#body-section div.list table tbody tr')
        const count = Array.from(remainingRows).reduce((sum, row) => {
          const input = row.querySelector<HTMLInputElement>('input[name="item[count][]"]')
          const value = Number.parseInt(input?.value ?? '0', 10)
          return sum + (Number.isFinite(value) ? value : 0)
        }, 0)
        document.querySelector('.amount p.count span')?.replaceChildren(String(count))
      }, index)
      state.cart = await readVisibleCart()
      return getState()
    })

  const call = async (options: CallOptions = {}) =>
    await locker(async () => {
      await ensurePage('call')
      await click(options.after ? '#call-after' : '#call-staff')
      const ok = await acceptDialog()
      return { result: ok ? 'OK' : 'NG' }
    })

  const callStaff = async () => await call({ after: false })
  const callDessert = async () => await call({ after: true })

  const close = async () => {
    await owned.context?.close()
    await owned.browser?.close()
  }

  const getState = (): ClientState => ({
    ...state,
    cart: state.cart.map((item) => ({ ...item })),
  })

  if (peopleCount !== undefined) {
    await setPeopleCount(peopleCount)
  }

  return {
    getState,
    getPage: () => page,
    close,
    setPeopleCount,
    lookupItem,
    addItem,
    submitOrder,
    goToMenu,
    goToCart,
    goToHistory,
    goToAccount,
    getAccount,
    showReceipt,
    getReceipt,
    reorder,
    removeCartItem,
    call,
    callStaff,
    callDessert,
  }
}
