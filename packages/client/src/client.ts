import { processQR } from './process-qr'
import type {
  AddItemOptions,
  CallOptions,
  ClientInit,
  ClientState,
  LookupItemResult,
  PageSubmitFields,
  AccountSummary,
  ReceiptSummary,
} from './types'
import { createFetch } from './utils/fetch'
import {
  createBaseFields,
  createOrderSubmitBody,
  createSearchParams,
  nowOrderTime,
} from './utils/forms'
import { PageParser } from './utils/page-parser'
import { createQueueLocker } from './utils/queue-locker'

export type {
  AddItemOptions,
  AccountLine,
  AccountSummary,
  CallOptions,
  CartItem,
  ClientInit,
  ClientState,
  ItemData,
  LookupItemResult,
  ReceiptSummary,
} from './types'

export const createClient = async ({
  qrURLSource,
  fetchSource,
  peopleCount,
  initialState,
}: ClientInit) => {
  const fetch = createFetch(fetchSource)
  const processedQR = initialState
    ? undefined
    : await processQR(new URL(qrURLSource ?? '').toString(), fetch)
  const locker = createQueueLocker()
  const state: ClientState = initialState
    ? Object.assign({}, initialState, {
        cart: initialState.cart.map((item) => ({ ...item })),
      })
    : {
        baseURL: processedQR!.baseURL,
        nextId: processedQR!.id,
        shopId: processedQR!.shopId,
        tableNo: processedQR!.tableNo,
        peopleCount: peopleCount ?? processedQR!.peopleCount ?? 0,
        token: processedQR!.token,
        sessionId: processedQR!.sessionId,
        pageKind: processedQR!.pageKind,
        cart: [],
      }

  const commandURL = (path: string) => new URL(path, state.baseURL)
  const pageURL = () => `${state.baseURL}?${state.nextId}`

  const updateFromPage = (parser: PageParser) => {
    state.nextId = parser.getNextActionId()
    state.token = parser.getToken() ?? state.token
    state.sessionId = parser.getSessionId() ?? state.sessionId
    state.pageKind = parser.getPageKind()
    state.peopleCount = parser.getPeopleCount() ?? state.peopleCount
  }

  const submitPage = async (fields: PageSubmitFields) => {
    const response = await fetch(pageURL(), {
      method: 'POST',
      body: createSearchParams(fields),
    })
    const parser = new PageParser(await response.text())
    updateFromPage(parser)
    return parser
  }

  const postJSONCommand = async <T>(
    path: string,
    fields: Record<string, string | number | boolean>,
  ): Promise<T> => {
    const response = await fetch(commandURL(path), {
      method: 'POST',
      body: createSearchParams(fields),
    })
    return (await response.json()) as T
  }

  const requireToken = () => {
    if (!state.token) {
      throw new Error('Token not found. Move to a token-bearing page first.')
    }
    return state.token
  }

  const moveToNumberPage = async (forced = true) => {
    return await submitPage({
      ...createBaseFields('number'),
      ctrl: forced ? 'forced' : '',
    })
  }

  const setPeopleCount = async (count: number) =>
    await locker(async () => {
      if (!Number.isInteger(count) || count < 1 || count > 99) {
        throw new Error('People count must be an integer between 1 and 99')
      }

      if (state.pageKind !== 'number') {
        await moveToNumberPage(true)
      }

      await submitPage({
        ...createBaseFields('menu', requireToken()),
        ctrl: 'number',
        number: count,
      })
      state.peopleCount = count
      return getState()
    })

  const lookupItem = async (code: string) =>
    await locker(async () => {
      if (!/^\d{4}$/.test(code)) {
        throw new Error('Item code must be 4 digits')
      }

      const result = await postJSONCommand<LookupItemResult>('./src/cmd/get_item.php', {
        sid: state.shopId,
        tno: state.tableNo,
        lng: '1',
        id: code,
        num: state.peopleCount,
        ssid: state.sessionId ?? '',
      })

      return result
    })

  const addItem = async (code: string, options: AddItemOptions = {}) =>
    await locker(async () => {
      if (!/^\d{4}$/.test(code)) {
        throw new Error('Item code must be 4 digits')
      }

      const count = options.count ?? 1
      const modId = options.modId ?? ''
      const modCount = options.modCount ?? 0
      if (!Number.isInteger(count) || count < 1 || count > 99) {
        throw new Error('Item count must be an integer between 1 and 99')
      }

      const item = await postJSONCommand<LookupItemResult>('./src/cmd/get_item.php', {
        sid: state.shopId,
        tno: state.tableNo,
        lng: '1',
        id: code,
        num: state.peopleCount,
        ssid: state.sessionId ?? '',
      })

      if (item.result !== 'OK' || !item.item_data) {
        throw new Error(`Item ${code} was not found`)
      }
      if (item.item_data.state === 0) {
        throw new Error(`Item ${code} is sold out`)
      }

      await submitPage({
        ...createBaseFields('main', requireToken()),
        ctrl: 'add',
        'ord-drkbar-cnt': '0',
        is_reorder: options.reorder ? '1' : '0',
        'order-time': nowOrderTime(),
        code,
        amount: count,
        mod_code: modId,
        mod_amount: modCount,
      })

      state.cart.push({
        id: code,
        name: item.item_data.name,
        price: item.item_data.price,
        count,
        reorder: options.reorder ? 1 : 0,
        modId,
        modCount,
      })

      return getState()
    })

  const goToMenu = async () =>
    await locker(async () => {
      await submitPage(createBaseFields('menu'))
      return getState()
    })

  const goToCart = async () =>
    await locker(async () => {
      await submitPage(createBaseFields('main', state.token))
      return getState()
    })

  const goToHistory = async () =>
    await locker(async () => {
      await submitPage({
        ...createBaseFields('history', state.token),
        ctrl: 'remember',
        code: '',
        'drinkbar-cnt': '0',
        'alcohol-cnt': '0',
        'ord-drkbar-cnt': '0',
      })
      return getState()
    })

  const goToAccount = async () =>
    await locker(async () => {
      await submitPage(createBaseFields('account', state.token))
      return getState()
    })

  const getAccount = async () =>
    await locker(async () => {
      const parser = await submitPage(createBaseFields('account', state.token))
      return {
        state: getState(),
        account: parser.getAccountSummary(),
      } satisfies { state: ClientState; account: AccountSummary }
    })

  const showReceipt = async () =>
    await locker(async () => {
      await submitPage(createBaseFields('receipt'))
      return getState()
    })

  const getReceipt = async () =>
    await locker(async () => {
      const parser = await submitPage(createBaseFields('receipt'))
      return {
        state: getState(),
        account: parser.getAccountSummary(),
        receipt: parser.getReceiptSummary(),
      } satisfies {
        state: ClientState
        account: AccountSummary
        receipt: ReceiptSummary
      }
    })

  const reorder = async (code: string) =>
    await locker(async () => {
      await submitPage({
        ...createBaseFields('menu'),
        ctrl: 'reorder',
        code,
      })
      return getState()
    })

  const removeCartItem = async (index: number) =>
    await locker(async () => {
      if (!Number.isInteger(index) || index < 0 || index >= state.cart.length) {
        throw new Error('Cart item was not found')
      }
      state.cart.splice(index, 1)
      return getState()
    })

  const submitOrder = async () =>
    await locker(async () => {
      if (state.cart.length === 0) {
        throw new Error('Cannot submit an empty cart')
      }

      const response = await fetch(pageURL(), {
        method: 'POST',
        body: createOrderSubmitBody(requireToken(), state.cart),
      })
      const parser = new PageParser(await response.text())
      updateFromPage(parser)
      state.cart = []
      return getState()
    })

  const call = async (options: CallOptions = {}) =>
    await locker(async () => {
      return await postJSONCommand<{ result: string }>('./src/cmd/tbl_call.php', {
        sid: state.shopId,
        tbl: state.tableNo,
        aft: options.after ?? false,
      })
    })

  const callStaff = async () => await call({ after: false })
  const callDessert = async () => await call({ after: true })

  const checkOrderStarted = async () =>
    await locker(async () => {
      return await postJSONCommand<{ result: string }>('./src/cmd/check_order.php', {
        sid: state.shopId,
        tno: state.tableNo,
      })
    })

  const checkLastOrder = async () =>
    await locker(async () => {
      return await postJSONCommand<{ result: string }>('./src/cmd/check_lastorder.php', {
        sid: state.shopId,
      })
    })

  const checkMidnight = async () =>
    await locker(async () => {
      return await postJSONCommand<{ result: string }>('./src/cmd/check_midnight.php', {
        sid: state.shopId,
      })
    })

  const confirmAlcohol = async () =>
    await locker(async () => {
      return await postJSONCommand<{ result: string }>('./src/cmd/put_alcohol.php', {
        sid: state.shopId,
        tno: state.tableNo,
        ssid: state.sessionId ?? '',
      })
    })

  const getState = (): ClientState => ({
    ...state,
    cart: state.cart.map((item) => ({ ...item })),
  })

  if (peopleCount !== undefined) {
    await setPeopleCount(peopleCount)
  }

  return {
    getState,
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
    checkOrderStarted,
    checkLastOrder,
    checkMidnight,
    confirmAlcohol,
  }
}
