/** @jsx react-jsx */
/** @jsxImportSource hono/jsx */
import { raw } from 'hono/html'
import type { Page } from '../main'

export type TemplatePage = Exclude<Page, 'order'>

export interface ShellOptions {
  page: TemplatePage
  title: string
  ctrl?: string
  children?: unknown
}

export const BrandLogo = ({ compact = false }: { compact?: boolean }) => (
  <img
    class={compact ? 'brand-logo compact' : 'brand-logo'}
    src={compact ? './data/mock/img/icon.png' : './data/mock/img/logo.png'}
    alt="Mock Order"
  />
)

const pageTitle = (page: TemplatePage) => `${page}-page`

const clientScript = (page: TemplatePage) => `
(() => {
  const form = document.getElementById('frm_ctrl');
  if (!(form instanceof HTMLFormElement)) return;

  const messages = {
    lastOrderClosed: 'Ordering is closed for this table. Please continue to checkout.',
    extraCharge: 'A time-based service charge notice applies before continuing.',
    invalidPeople: 'Enter a party size in the supported range.',
    confirmPeople: (count) => 'Use party size: ' + count + '?',
    invalidCode: 'Enter a four digit item code.',
    missingCode: 'Enter an item code before continuing.',
    notFound: 'No item matches that code.',
    lookupFailed: 'Item lookup failed. Please try again.',
    unavailable: 'This item is currently unavailable.',
    dataError: 'This item has incompatible option data.',
    confirmPopup: 'Please confirm this item notice.',
    restricted: 'Please confirm this restricted item before adding it.',
    readyToAdd: 'Review the item and quantity, then confirm.',
    enterCode: 'Enter an item code.',
    emptyCart: 'Add at least one item before submitting.',
    confirmSubmit: 'Submit this order?',
    confirmRemove: 'Remove this row?',
    visibleCartReset: 'The visible cart was reset after browser navigation.',
    callSuccess: 'The request was sent.',
    callFailed: 'The request could not be sent.',
  };

  const setField = (id, value) => {
    const el = document.getElementById(id);
    if (el instanceof HTMLInputElement) el.value = String(value);
  };

  const getField = (id) => {
    const el = document.getElementById(id);
    return el instanceof HTMLInputElement ? el.value : '';
  };

  const postForm = (path, values) => {
    const body = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => body.set(key, String(value)));
    return fetch(path, { method: 'POST', body });
  };

  const setAndSubmit = (values) => {
    Object.entries(values).forEach(([key, value]) => setField(key, value));
    form.requestSubmit();
  };

  const createModal = (message, buttons) => {
    if (document.getElementById('base-overlay')) return Promise.resolve('busy');
    const overlay = document.createElement('div');
    overlay.id = 'base-overlay';
    overlay.className = 'ui-widget-overlay ui-front';
    overlay.setAttribute('role', 'presentation');
    const dialog = document.createElement('div');
    dialog.className = 'mock-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    const text = document.createElement('p');
    text.textContent = String(message);
    const actions = document.createElement('div');
    actions.className = 'ui-dialog-buttonset';
    dialog.append(text, actions);
    overlay.append(dialog);
    document.body.append(overlay);
    document.body.classList.add('dialog-open');
    return new Promise((resolve) => {
      buttons.forEach((button) => {
        const node = document.createElement('button');
        node.type = 'button';
        node.textContent = button.label;
        node.addEventListener('click', () => {
          document.body.classList.remove('dialog-open');
          overlay.remove();
          resolve(button.value);
        });
        actions.append(node);
      });
      actions.querySelector('button:last-child')?.focus();
    });
  };

  window.alert = (message, okCallback = () => {}) => {
    createModal(message, [{ label: 'OK', value: 'ok' }]).then(() => okCallback());
  };

  window.confirm = (message, okCallback = () => {}, cancelCallback = () => {}, reverse = false) => {
    const buttons = reverse
      ? [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'cancel' }]
      : [{ label: 'No', value: 'cancel' }, { label: 'Yes', value: 'yes' }];
    createModal(message, buttons).then((value) => {
      if (value === 'yes') okCallback();
      else cancelCallback();
    });
  };

  window.alcohol = (_title, message, okCallback = () => {}, cancelCallback = () => {}) => {
    createModal(message, [
      { label: 'Back', value: 'cancel' },
      { label: 'Confirm', value: 'yes' },
    ]).then((value) => {
      if (value === 'yes') okCallback();
      else cancelCallback();
    });
  };

  const alertAsync = (message) => new Promise((resolve) => window.alert(message, resolve));
  const confirmAsync = (message, reverse = false) =>
    new Promise((resolve) => window.confirm(message, () => resolve(true), () => resolve(false), reverse));

  const checkLastOrder = async () => {
    try {
      const response = await postForm('./src/cmd/check_lastorder.php', { sid: getField('shop-id') });
      const data = await response.json();
      return data.result === 'OK';
    } catch {
      return false;
    }
  };

  const goOrderEntry = async (proc) => {
    if (await checkLastOrder()) {
      await alertAsync(messages.lastOrderClosed);
      setAndSubmit({ proc: 'account', ctrl: 'clear' });
      return;
    }
    setAndSubmit({ proc });
  };

  document.getElementById('header')?.querySelector('h1')?.addEventListener('click', (event) => {
    event.preventDefault();
    setAndSubmit({ proc: 'top' });
  });

  document.querySelectorAll('#footer li').forEach((tab) => {
    tab.addEventListener('click', async (event) => {
      const target = event.currentTarget;
      if (!(target instanceof HTMLElement)) return;
      const procById = {
        'order-add': 'menu',
        'order-list': 'main',
        'order-history': 'history',
        'after-call': 'call',
        'do-account': 'account',
      };
      const proc = procById[target.id];
      if (!proc) return;
      event.preventDefault();
      if (target.classList.contains('disabled')) return;
      if (proc === 'menu' || proc === 'main') {
        await goOrderEntry(proc);
        return;
      }
      setAndSubmit({ proc });
    });
  });

  if (${JSON.stringify(page)} === 'top' || ${JSON.stringify(page)} === 'entry') {
    const startOrder = async (event) => {
      event.preventDefault();
      if (await checkLastOrder()) {
        await alertAsync(messages.lastOrderClosed);
        setAndSubmit({ proc: 'account', ctrl: 'clear' });
        return;
      }
      try {
        const response = await postForm('./src/cmd/check_midnight.php', { sid: getField('shop-id') });
        const data = await response.json();
        if (data.result === 'OK') await alertAsync(messages.extraCharge);
      } catch {}
      setAndSubmit({ proc: 'number' });
    };

    const changePeople = async (event) => {
      event.preventDefault();
      if (await checkLastOrder()) {
        await alertAsync(messages.lastOrderClosed);
        setAndSubmit({ proc: 'account', ctrl: 'clear' });
        return;
      }
      setAndSubmit({ proc: 'number', ctrl: 'forced' });
    };

    postForm('./src/cmd/check_order.php', {
      sid: getField('shop-id'),
      tno: getField('table-no'),
    })
      .then((response) => response.json())
      .then((data) => document.body.classList.toggle('start', data.result !== 'OK'))
      .catch(() => {});

    document.querySelector('#body-section #order')?.addEventListener('click', startOrder);
    document.querySelector('#body-section #number')?.addEventListener('click', changePeople);
    document.querySelector('[data-action="change-people"]')?.addEventListener('click', changePeople);
  }

  if (${JSON.stringify(page)} === 'number') {
    const confirmPeople = async (count) => {
      if (!Number.isFinite(count) || count < 1 || count > 99) {
        await alertAsync(messages.invalidPeople);
        return;
      }
      if (!(await confirmAsync(messages.confirmPeople(count)))) return;
      setAndSubmit({ number: count, proc: 'menu', ctrl: 'number' });
    };

    document.querySelectorAll('.btn.num:not(.ent)').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const id = button.getAttribute('id') || '';
        const count = Number.parseInt(id.slice(2), 10);
        if (count < 1 || count > 8) {
          alertAsync(messages.invalidPeople);
          return;
        }
        confirmPeople(count);
      });
    });

    document.querySelector('.btn.num.ent')?.addEventListener('click', (event) => {
      event.preventDefault();
      document.querySelector('.number')?.classList.add('enter');
    });

    document.getElementById('back')?.addEventListener('click', (event) => {
      event.preventDefault();
      document.querySelector('.number')?.classList.remove('enter');
    });

    document.getElementById('decide')?.addEventListener('click', (event) => {
      event.preventDefault();
      const input = document.getElementById('nox');
      const count = input instanceof HTMLInputElement ? Number.parseInt(input.value, 10) : NaN;
      confirmPeople(count);
    });
  }

  if (${JSON.stringify(page)} === 'menu') {
    const enter = document.getElementById('enter');
    const order = document.getElementById('order');
    const decide = document.getElementById('deside');
    const back = document.getElementById('back');
    const amountInput = document.getElementById('amount');
    const modAmountInput = document.getElementById('mod_amount');
    const orderTimeInput = document.getElementById('order-time');
    const mainName = document.querySelector('.detail .main .name dt');
    const mainPrice = document.querySelector('.detail .main .name dd');
    const modSection = document.querySelector('.detail .mod');
    const modName = document.querySelector('.detail .mod .name dt');
    const modPrice = document.querySelector('.detail .mod .name dd');
    const notice = document.querySelector('.notice-balloon .msg-base span');
    const guide = document.getElementById('guide');
    const guideText = guide ? guide.querySelector('.msg-base span') : null;
    const base = document.getElementById('body-section');
    const title = document.querySelector('#header h1');
    const logo = document.querySelector('.menu .logo');
    let entered = '';
    let resolved = null;

    const setNotice = (text) => {
      if (notice) notice.textContent = text;
    };

    const renderEntered = () => {
      if (enter) enter.textContent = entered || '\\u00a0';
    };

    const resetDetail = () => {
      resolved = null;
      setField('code', '');
      setField('mod_code', '');
      if (mainName) mainName.textContent = '\\u00a0';
      if (mainPrice) mainPrice.textContent = '0\\u5186';
      if (modName) modName.textContent = '\\u00a0';
      if (modPrice) modPrice.textContent = '';
      if (modAmountInput instanceof HTMLInputElement) modAmountInput.value = '0';
      if (modSection instanceof HTMLElement) modSection.style.display = 'none';
      if (guide instanceof HTMLElement) guide.style.display = 'none';
      if (logo instanceof HTMLElement) logo.classList.remove('hidden');
    };

    const lookupItem = async () => {
      if (entered.length !== 4) {
        resetDetail();
        setNotice(messages.enterCode);
        return;
      }
      try {
        const response = await postForm('./src/cmd/get_item.php', {
          sid: getField('shop-id'),
          tno: getField('table-no'),
          lng: 1,
          id: entered,
          num: getField('number') || 1,
          ssid: getField('session-id'),
        });
        const data = await response.json();
        if (data.result !== 'OK' || !data.item_data) {
          resetDetail();
          setNotice(messages.notFound);
          await alertAsync(messages.notFound);
          return;
        }

        if (data.item_data.state === 0) {
          resetDetail();
          await alertAsync(messages.unavailable);
          return;
        }

        if (data.item_data.state === 1) {
          resetDetail();
          return;
        }

        const detailNoticeCount = [
          data.item_data.popup ? 1 : 0,
          data.item_data.notice ? 1 : 0,
          Number(data.item_data.arc_type || 0) > 0 ? 1 : 0,
        ].reduce((sum, value) => sum + value, 0);
        if (detailNoticeCount > 1) {
          resetDetail();
          await alertAsync(messages.dataError);
          return;
        }

        resolved = data.item_data;
        setField('code', entered);
        if (mainName) mainName.textContent = data.item_data.name || '\\u00a0';
        if (mainPrice) mainPrice.textContent = String(data.item_data.price || 0) + '\\u5186';
        setNotice(data.item_data.notice || messages.readyToAdd);
        if (logo instanceof HTMLElement) logo.classList.add('hidden');

        if (data.item_data.mod_id) {
          setField('mod_code', data.item_data.mod_id);
          if (modName) modName.textContent = data.item_data.mod_name || '\\u00a0';
          if (modPrice) modPrice.textContent = data.item_data.mod_price
            ? String(data.item_data.mod_price) + '\\u5186'
            : '';
          if (modAmountInput instanceof HTMLInputElement) {
            modAmountInput.value = String(data.item_data.mod_ini_cnt || 0);
          }
          if (modSection instanceof HTMLElement) modSection.style.display = '';
          if (guide instanceof HTMLElement && guideText && data.item_data.mod_guid) {
            guide.style.display = '';
            guideText.textContent = data.item_data.mod_guid;
          }
        } else {
          setField('mod_code', '');
          if (modSection instanceof HTMLElement) modSection.style.display = 'none';
          if (guide instanceof HTMLElement) guide.style.display = 'none';
        }

        if (data.item_data.popup && !(await confirmAsync(messages.confirmPopup))) {
          entered = '';
          renderEntered();
          resetDetail();
          return;
        }

        if (data.alcohol_check === 1) {
          const accepted = await new Promise((resolve) =>
            window.alcohol('', messages.restricted, () => resolve(true), () => resolve(false)),
          );
          if (!accepted) {
            entered = '';
            renderEntered();
            resetDetail();
            return;
          }
          await postForm('./src/cmd/put_alcohol.php', {
            sid: getField('shop-id'),
            tno: getField('table-no'),
            ssid: getField('session-id'),
          }).catch(() => {});
        }
      } catch {
        resetDetail();
        setNotice(messages.lookupFailed);
        await alertAsync(messages.lookupFailed);
      }
    };

    const adjustCount = (input, delta, minimum) => {
      if (!(input instanceof HTMLInputElement)) return;
      const current = Number.parseInt(input.value || String(minimum), 10);
      const next = Math.max(minimum, Math.min(99, current + delta));
      input.value = String(next);
    };

    const submitAdd = (event) => {
      if (event) event.preventDefault();
      if (!resolved || entered.length !== 4) {
        setNotice(messages.invalidCode);
        alertAsync(entered.length === 0 ? messages.missingCode : messages.invalidCode);
        return;
      }
      setField('proc', 'main');
      setField('ctrl', 'add');
      if (orderTimeInput instanceof HTMLInputElement) {
        const now = new Date();
        const pad = (value) => String(value).padStart(2, '0');
        orderTimeInput.value =
          now.getFullYear() + '/' +
          pad(now.getMonth() + 1) + '/' +
          pad(now.getDate()) + ',' +
          pad(now.getHours()) + ':' +
          pad(now.getMinutes()) + ':' +
          pad(now.getSeconds());
      }
      form.requestSubmit();
    };

    const showDetail = (event) => {
      if (event) event.preventDefault();
      if (entered.length === 0) {
        alertAsync(messages.missingCode);
        return;
      }
      if (entered.length !== 4 || !resolved) {
        alertAsync(messages.invalidCode);
        return;
      }
      base?.classList.add('detail');
      if (title) title.textContent = 'Select quantity';
    };

    renderEntered();
    resetDetail();
    document.querySelectorAll('.tenkey li[data-val]').forEach((key) => {
      key.addEventListener('click', async () => {
        if (entered.length >= 4) return;
        entered += key.getAttribute('data-val') || '';
        renderEntered();
        await lookupItem();
      });
    });
    document.querySelector('.tenkey .del')?.addEventListener('click', async () => {
      entered = entered.slice(0, -1);
      renderEntered();
      setField('is_reorder', '0');
      await lookupItem();
    });
    if (back) {
      back.addEventListener('click', (event) => {
        event.preventDefault();
        if (getField('sub_ctrl') === 'add_drink') {
          setAndSubmit({ proc: 'top' });
          return;
        }
        base?.classList.remove('detail');
        if (title) title.textContent = 'Enter item code';
      });
    }
    if (order) order.addEventListener('click', showDetail);
    if (decide) decide.addEventListener('click', submitAdd);
    document.querySelector('.detail .main #minus')?.addEventListener('click', () => adjustCount(amountInput, -1, 1));
    document.querySelector('.detail .main #plus')?.addEventListener('click', () => adjustCount(amountInput, 1, 1));
    document.querySelector('.detail .mod #minus')?.addEventListener('click', () => adjustCount(modAmountInput, -1, 0));
    document.querySelector('.detail .mod #plus')?.addEventListener('click', () => adjustCount(modAmountInput, 1, 0));
  }

  if (${JSON.stringify(page)} === 'main') {
    const visibleRows = () => Array.from(document.querySelectorAll('#body-section div.list table tbody tr'));
    const recalc = () => {
      let count = 0;
      let total = 0;
      visibleRows().forEach((row) => {
        const qtyInput = row.querySelector('input[name="item[count][]"]');
        const qty = qtyInput instanceof HTMLInputElement
          ? Number.parseInt(qtyInput.value || '0', 10)
          : Number.parseInt(row.children[1]?.textContent || '0', 10);
        const price = Number.parseInt((row.getAttribute('data-unit-price') || '0'), 10);
        count += Number.isFinite(qty) ? qty : 0;
        total += price * (Number.isFinite(qty) ? qty : 0);
      });
      document.querySelector('.amount p.count span')?.replaceChildren(String(count));
      document.querySelector('.amount p.amount span')?.replaceChildren(total.toLocaleString());
      return count;
    };

    window.addEventListener('pageshow', async () => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const legacyBack = window.performance?.navigation?.type === 2;
      if (legacyBack || navigation?.type === 'back_forward') {
        document.querySelector('#body-section div.list table tbody')?.replaceChildren();
        document.querySelectorAll('input[name^="item["]').forEach((input) => input.remove());
        recalc();
        await alertAsync(messages.visibleCartReset);
      }
    });

    document.querySelector('.command #menu')?.addEventListener('click', async (event) => {
      event.preventDefault();
      await goOrderEntry('menu');
    });

    document.querySelector('.command #order')?.addEventListener('click', async (event) => {
      event.preventDefault();
      if (await checkLastOrder()) {
        await alertAsync(messages.lastOrderClosed);
        setAndSubmit({ proc: 'account', ctrl: 'clear' });
        return;
      }
      if (recalc() < 1) {
        await alertAsync(messages.emptyCart);
        return;
      }
      if (await confirmAsync(messages.confirmSubmit)) {
        setAndSubmit({ proc: 'order' });
      }
    });

    document.querySelectorAll('div.list div.name>span, .del').forEach((target) => {
      target.addEventListener('click', async (event) => {
        event.preventDefault();
        if (!(await confirmAsync(messages.confirmRemove))) return;
        target.closest('tr')?.remove();
        recalc();
      });
    });

    document.querySelectorAll('.minus, .plus').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const row = button.closest('tr');
        const input = row?.querySelector('input[name="item[count][]"]');
        if (!(input instanceof HTMLInputElement)) return;
        const min = input.classList.contains('zero') ? 0 : 1;
        const delta = button.classList.contains('plus') ? 1 : -1;
        const next = Math.max(min, Math.min(99, Number.parseInt(input.value || String(min), 10) + delta));
        input.value = String(next);
        recalc();
      });
    });
  }

  if (${JSON.stringify(page)} === 'history') {
    document.querySelectorAll('.reorder.red[data-id]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        if (await checkLastOrder()) {
          await alertAsync(messages.lastOrderClosed);
          setAndSubmit({ proc: 'account', ctrl: 'clear' });
          return;
        }
        setAndSubmit({ code: button.getAttribute('data-id') || '', proc: 'menu', ctrl: 'reorder' });
      });
    });
  }

  if (${JSON.stringify(page)} === 'call') {
    const message = document.querySelector('#body-section .message');
    const callAfter = document.getElementById('call-after');
    const triggerCall = async (after) => {
      try {
        await postForm('./src/cmd/tbl_call.php', {
          sid: getField('shop-id'),
          tbl: getField('table-no'),
          aft: after ? 'true' : 'false',
        });
        if (message) message.textContent = messages.callSuccess;
        window.setTimeout(() => setAndSubmit({ proc: 'top' }), 5000);
        await alertAsync(messages.callSuccess);
        setAndSubmit({ proc: 'top' });
      } catch {
        if (message) message.textContent = messages.callFailed;
        await alertAsync(messages.callFailed);
      }
    };
    document.getElementById('call-staff')?.addEventListener('click', (event) => {
      event.preventDefault();
      triggerCall(false);
    });
    callAfter?.addEventListener('click', (event) => {
      event.preventDefault();
      if (!callAfter.classList.contains('disabled')) triggerCall(true);
    });
  }

  if (${JSON.stringify(page)} === 'account') {
    document.querySelector('.command #decide, #decide')?.addEventListener('click', (event) => {
      event.preventDefault();
      setAndSubmit({ proc: 'receipt' });
    });
  }
})();
`

const tabClass = (page: TemplatePage, id: string) => {
  const selectedByPage: Partial<Record<TemplatePage, string>> = {
    entry: 'order-add',
    account: 'do-account',
    call: 'after-call',
    history: 'order-history',
    menu: 'order-add',
    top: 'order-add',
  }
  const disabledByPage: Partial<Record<TemplatePage, string[]>> = {
    account: ['do-account'],
    call: ['after-call'],
    entry: ['order-list'],
    main: ['order-add', 'do-account'],
    top: ['order-list'],
    menu: ['order-add'],
    number: ['order-add', 'order-list', 'order-history', 'after-call', 'do-account'],
    receipt: ['order-add', 'order-list', 'order-history', 'after-call', 'do-account'],
  }
  return [
    disabledByPage[page]?.includes(id) ? 'disabled' : '',
    selectedByPage[page] === id ? 'selected' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

const FooterTab = ({
  id,
  page,
  proc,
  children,
}: {
  id: string
  page: TemplatePage
  proc: TemplatePage
  children: unknown
}) => {
  const className = tabClass(page, id)
  return (
    <li id={id} class={className}>
      <button type="button" name="proc" value={proc} data-proc={proc}>
        <p>{children}</p>
      </button>
    </li>
  )
}

export const Footer = ({ page }: { page: TemplatePage }) => (
  <div id="footer">
    <ul id="menu">
      <FooterTab id="order-add" page={page} proc="menu">
        注文
        <br />
        追加
      </FooterTab>
      <FooterTab id="order-list" page={page} proc="main">
        注文
        <br />
        かご
      </FooterTab>
      <FooterTab id="order-history" page={page} proc="history">
        注文
        <br />
        履歴
      </FooterTab>
      <FooterTab id="after-call" page={page} proc="call">
        店員
        <br />
        呼出
      </FooterTab>
      <FooterTab id="do-account" page={page} proc="account">
        会計
        <br />
        する
      </FooterTab>
    </ul>
  </div>
)

export const Shell = ({ page, title, ctrl = '', children }: ShellOptions) => (
  <html lang="ja">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width" />
      <meta name="color-scheme" content="light" />
      <meta name="robots" content="noindex,nofollow" />
      <title>Mock Order</title>
      <style>{`
        body { margin: 0; font-family: system-ui, sans-serif; color: #202124; background: #f7f7f3; }
        .off-canvas-wrap, .inner-wrap { min-height: 100vh; }
        form { max-width: 560px; min-height: 100vh; margin: 0 auto; background: #fff; }
        #header { padding: 18px 20px; border-bottom: 1px solid #e4e1d8; background: #fefdf9; }
        h1 { margin: 0; font-size: 20px; font-weight: 700; }
        #body-section { padding: 22px 20px; }
        .logo { text-align: center; margin: 18px 0; }
        .brand-logo { max-width: 260px; width: 70%; height: auto; }
        .brand-logo.compact { max-width: 80px; }
        .btn, button, .button { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 18px; border: 1px solid #1f7a4f; border-radius: 6px; background: #238957; color: #fff; font: inherit; text-decoration: none; cursor: pointer; }
        .text { color: inherit; background: transparent; border-color: #dedbd1; }
        .base, .list-base, .amount { margin: 16px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px 8px; border-bottom: 1px solid #e8e3da; text-align: left; }
        td:nth-child(2), td:nth-child(3), th:nth-child(2), th:nth-child(3) { text-align: right; }
        .amount { display: flex; justify-content: space-between; gap: 16px; font-weight: 700; }
        .barcode { text-align: center; margin: 20px 0; }
        .barcode img { max-width: 260px; width: 80%; height: 40px; object-fit: contain; }
        .table { text-align: center; font-size: 28px; font-weight: 700; }
        .number input { font: inherit; font-size: 28px; width: 4em; text-align: center; }
        .command, .main, .mod, .detail { margin: 12px 0; }
        .menu .command, .detail .command { display: flex; gap: 10px; align-items: center; }
        .menu .command .name { flex: 1; min-height: 44px; display: flex; align-items: center; padding: 0 14px; border: 1px solid #dedbd1; border-radius: 6px; background: #fbfaf6; }
        .menu .code { margin: 12px 0; }
        .menu .code p { min-height: 48px; margin: 0; display: flex; align-items: center; justify-content: center; border: 1px solid #dedbd1; border-radius: 6px; background: #fff; font-size: 28px; letter-spacing: 0.08em; }
        .tenkey ul { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 0; margin: 12px 0 0; list-style: none; }
        .tenkey li { min-height: 48px; display: flex; align-items: center; justify-content: center; border: 1px solid #d6d3c8; border-radius: 6px; background: #f3f1ea; }
        .tenkey li.clear { background: transparent; border-color: transparent; }
        .notice-balloon, #guide { margin-top: 12px; }
        .msg-base { display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 12px; border: 1px solid #e6dfcd; border-radius: 6px; background: #fff8e7; color: #6a5730; }
        .balloon-arrow { width: 0; height: 0; margin-left: 14px; border-left: 8px solid transparent; border-right: 8px solid transparent; border-bottom: 8px solid #e6dfcd; }
        .detail .main, .detail .mod { padding: 14px; border: 1px solid #e4e1d8; border-radius: 6px; background: #fcfbf7; }
        .detail dl.name { display: flex; justify-content: space-between; gap: 12px; margin: 0 0 12px; }
        .detail dl.name dt, .detail dl.name dd { margin: 0; }
        .detail ul.amount { display: grid; grid-template-columns: 52px 1fr 52px; gap: 8px; padding: 0; margin: 0; list-style: none; align-items: center; }
        .detail ul.amount .cmd { min-height: 44px; display: flex; align-items: center; justify-content: center; border: 1px solid #d6d3c8; border-radius: 6px; background: #f3f1ea; font-size: 24px; }
        .detail ul.amount input { width: 100%; min-height: 44px; border: 1px solid #dedbd1; border-radius: 6px; background: #fff; text-align: center; font: inherit; }
        .detail .command .btn { flex: 1; }
        #footer { position: sticky; bottom: 0; background: #fff; border-top: 1px solid #e4e1d8; }
        #footer ul#menu { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0; margin: 0; padding: 0; list-style: none; }
        #footer li { min-width: 0; border-left: 1px solid #ece7de; }
        #footer li:first-child { border-left: 0; }
        #footer button { width: 100%; min-height: 60px; padding: 6px 2px; border: 0; border-radius: 0; background: #fbfaf6; color: #383a37; font-size: 12px; line-height: 1.25; }
        #footer p { margin: 0; }
        #footer li.selected button { background: #238957; color: #fff; }
        #footer li.disabled button { opacity: 0.55; }
        body.dialog-open { overflow: hidden; }
        #base-overlay { position: fixed; inset: 0; z-index: 9999998; display: grid; place-items: center; padding: 20px; background: rgba(0, 0, 0, 0.42); }
        .mock-dialog { width: min(420px, 100%); padding: 18px; border-radius: 6px; background: #fff; box-shadow: 0 18px 60px rgba(0, 0, 0, 0.24); }
        .mock-dialog p { margin: 0 0 16px; line-height: 1.6; }
        .ui-dialog-buttonset { display: flex; justify-content: flex-end; gap: 8px; }
        .ui-dialog-buttonset button { min-width: 84px; }
        .hidden { display: none !important; }
      `}</style>
    </head>
    <body class={page === 'entry' ? 'start' : undefined}>
      <div class="off-canvas-wrap">
        <div class="inner-wrap portrait">
          <form
            id="frm_ctrl"
            class={page === 'entry' ? 'entry-page top-page' : pageTitle(page)}
            action={`./?${crypto.randomUUID()}`}
            method="post"
          >
            <input type="hidden" id="proc" name="proc" value={page === 'entry' ? 'top' : page} />
            <input type="hidden" id="ctrl" name="ctrl" value={ctrl} />
            <input type="hidden" id="sub_ctrl" name="sub_ctrl" value="" />
            <input type="hidden" id="cur_lang" name="cur_lang" value="1" />
            <input type="hidden" id="message" name="message" value="" />
            <input type="hidden" id="shop-id" value="525" />
            <input type="hidden" id="table-no" value="51" />
            <input type="hidden" id="session-id" value="mock-session" />
            <input type="hidden" id="number" name="number" value="2" />
            <input type="hidden" id="token" name="token" value="mock-token" />
            <div id="header" class="float-clear">
              <h1>{title}</h1>
            </div>
            {children}
            <Footer page={page} />
          </form>
        </div>
      </div>
      {raw(`<script>${clientScript(page)}</script>`)}
    </body>
  </html>
)

export const OrderList = () => (
  <div class="list-base">
    <div class="list">
      <table>
        <tbody></tbody>
      </table>
    </div>
  </div>
)

export const AmountSummary = () => (
  <div class="amount">
    <p class="count">
      <span>0</span>点
    </p>
    <p class="amount">
      合計&nbsp;<span>0</span>円 (税込)
    </p>
  </div>
)
