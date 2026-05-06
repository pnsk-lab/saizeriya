# Saizeriya Order Protocol

## Scope

The compatibility server exposes the same app under both `/saizeriya2/` and `/saizeriya3/`. A table session is held in memory, and page navigation is form-based:

1. A QR URL or direct URL resolves to a table session.
2. The first QR access displays the `entry` page for that table session.
3. The server returns an HTML page with `form#frm_ctrl`.
4. The client sets hidden fields such as `proc` and `ctrl`.
5. The client submits the form with POST to `./?{urlId}`.
6. Ajax endpoints under `./src/cmd/*.php` provide status checks, item lookup, and staff call behavior.
7. When an order is submitted, the server moves cart lines into submitted orders, clears the cart, marks ordering as started, and renders the call page.

## Clean-Room Constraints

An implementation may keep these functional compatibility points:

| May Preserve                                                                                                                                            | Must Not Copy                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| URL paths, HTTP methods, form field names, JSON field names, selector names used as API hooks, page state names, numeric limits, and state transitions. | Original source code, exact UI strings, HTML document structure beyond required hooks, CSS, images, icons, fonts, audio, proprietary branding, and distinctive visual layout. |

Dialog messages should be represented by semantic message keys or newly written text. For example, use concepts such as `last_order_closed`, `empty_cart`, or `confirm_submit_order` rather than reproducing historical wording.

## State Model

Each table session stores:

| Field                   | Type           | Behavior                                                                                                                                                               |
| ----------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shopId`                | number         | Store/location identifier. Default: `525`. Reflected in `#shop-id` and Ajax `sid`.                                                                                     |
| `tableId`               | number         | Table identifier. Default: `51`. Reflected in `#table-no`, `data-tbl`, and Ajax `tno`/`tbl`.                                                                           |
| `peopleCount`           | number         | Party size. New QR entry sessions may start at `0` or unset until the party-size flow completes; normal ordering pages should reflect the selected count in `#number`. |
| `peopleCountRegistered` | boolean        | Whether the initial party-size registration has completed for this QR/table session. This is shared by all devices using the same QR/table session.                    |
| `page`                  | page enum      | One of `entry`, `top`, `number`, `menu`, `main`, `history`, `call`, `account`, `receipt`, `order`. `order` is a submit action; render `call` after processing it.      |
| `token`                 | string         | Per-post dummy token. Reflected in hidden input `name="token"`.                                                                                                        |
| `sessionId`             | string         | Session identifier. Reflected in `#session-id`; used for receipt code generation.                                                                                      |
| `cart`                  | `CartLine[]`   | Unsubmitted order lines.                                                                                                                                               |
| `submittedOrders`       | `CartLine[][]` | Submitted order batches. Used by history, account, and receipt flows.                                                                                                  |
| `staffCallCount`        | number         | Count of normal staff calls.                                                                                                                                           |
| `dessertCallCount`      | number         | Count of after-service calls where `aft` is `"true"`.                                                                                                                  |
| `lastOrderClosed`       | boolean        | Drives `check_lastorder.php`.                                                                                                                                          |
| `midnightCharge`        | boolean        | Drives `check_midnight.php`.                                                                                                                                           |
| `orderStarted`          | boolean        | Drives `check_order.php`; also controls the `body.start` state on the top page.                                                                                        |
| `receiptShown`          | boolean        | Set when the receipt page is requested.                                                                                                                                |

`CartLine`:

| Field      | Type                   | Source                                                  |
| ---------- | ---------------------- | ------------------------------------------------------- | ------------------------------- |
| `id`       | string                 | `code` or `item[id][]`.                                 |
| `count`    | number                 | `amount` or `item[count][]`.                            |
| `reorder`  | `0                     | 1`                                                      | `item[reorder][]`; default `0`. |
| `modId`    | string                 | `mod_code` or `item[mod_id][]`; default empty string.   |
| `modCount` | number or empty string | `mod_amount` or `item[mod_count][]`; empty when absent. |

## Routes

### Dashboard

These routes are test utilities and do not need to match legacy visual design.

| Method | Path                                 | Behavior                                                                                         |
| ------ | ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| GET    | `/dashboard`, `/dashboard/`          | Render a table/menu management page.                                                             |
| POST   | `/dashboard/tables`                  | Create a table from `shopId` and `tableId`; default to `525` and `51`. Redirect to `/dashboard`. |
| POST   | `/dashboard/table/:id`               | Update `peopleCount`, `page`, `lastOrderClosed`, `midnightCharge`, and `orderStarted`.           |
| POST   | `/dashboard/table/:id/confirm-order` | Move current cart into submitted orders and clear the cart.                                      |
| POST   | `/dashboard/table/:id/clear-cart`    | Clear current cart.                                                                              |
| POST   | `/dashboard/table/:id/reset-calls`   | Reset call counters.                                                                             |
| POST   | `/dashboard/menu`                    | Upsert a menu item from `id`, `name`, `price`, `state`, and `alcohol_check`.                     |

### App Routes

Mount the same routes at `/saizeriya2/` and `/saizeriya3/`.

| Method | Path                                 | Behavior                                                                                                                                    |
| ------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/qr?table={tableUuid}`              | If `table` matches an existing session, use it; otherwise create a default session whose current page is `entry`. Redirect to `./?{urlId}`. |
| any    | `/`                                  | GET renders the current page. POST applies form data first, then renders the next page.                                                     |
| POST   | `/src/cmd/check_order.php`           | Return whether ordering has started.                                                                                                        |
| POST   | `/src/cmd/check_lastorder.php`       | Return whether ordering should be blocked by last-order state.                                                                              |
| POST   | `/src/cmd/check_midnight.php`        | Return whether an extra-charge notice should be shown.                                                                                      |
| POST   | `/src/cmd/put_alcohol.php`           | Record or acknowledge age/restricted-item confirmation.                                                                                     |
| POST   | `/src/cmd/tbl_call.php`              | Record a staff or after-service call.                                                                                                       |
| POST   | `/src/cmd/get_item.php`              | Look up a menu item by code.                                                                                                                |
| GET    | `/src/page/js/base.js.php?JS={file}` | Optional legacy dynamic JS compatibility route. Reject `..`; 404 when missing.                                                              |
| GET    | `/data/:path{.+}`                    | Static data route. Reject `..`; 404 when missing.                                                                                           |
| GET    | `/src/:path{.+}`                     | Static source asset route. Reject `..`; 404 when missing. `.js.php` and `.css.php` may map to local safe equivalents.                       |

QR-style direct access to `/` should also recognize query parameters containing `SN` or `TN`. Use `SN` as `shopId`. For historical compatibility, table lookup may read `TB` as `tableId` even when the presence check used `TN`.

The first-access decision is table-session state, not device-local state. If two devices scan the same QR before the party size is registered, both may see `entry`. Once any device completes the party-size flow and submits `proc=menu`, `ctrl=number`, and `number=n`, `peopleCountRegistered` becomes true for that shared table session. Later scans of the same QR should land on the normal `top` page instead of `entry`.

## Command JSON

All command responses should be JSON with `content-type: application/json; charset=UTF-8`.

### `check_order.php`

Input fields: `sid`, and either `tno` or `tbl`.

Return:

```json
{ "result": "OK" }
```

Use `OK` when `orderStarted` is true; otherwise use `NG`. The top page client uses this to toggle `body.start`.

### `check_lastorder.php`

Input fields: `sid`.

Return:

```json
{ "result": "OK", "lastorder": true }
```

Use `OK` when `lastOrderClosed` is true; otherwise use `NG`. `lastorder` must be a boolean. When this returns `OK`, order-entry actions should stop normal ordering and submit `proc=account`, `ctrl=clear`.

### `check_midnight.php`

Input fields: `sid`.

Return:

```json
{ "result": "OK" }
```

Use `OK` when `midnightCharge` is true; otherwise use `NG`. The client should show a newly authored extra-charge notice before moving to the party-size page.

### `put_alcohol.php`

Input fields: `sid`, `tno`, `ssid`.

Return:

```json
{ "result": "OK" }
```

This endpoint acknowledges restricted-item confirmation. No persistent side effect is required for the mock.

### `tbl_call.php`

Input fields: `sid`, `tbl`, `aft`.

Return:

```json
{ "result": "OK" }
```

If a matching table exists, increment `dessertCallCount` when `aft === "true"`; otherwise increment `staffCallCount`. On success, the client should show a newly authored success dialog and then submit `proc=top` either after user acknowledgement or after a timeout.

### `get_item.php`

Input fields: `sid`, `tno`, `lng`, `id`, `num`, `ssid`.

Success:

```json
{
  "result": "OK",
  "alcohol_check": 0,
  "item_data": {
    "id": "1201",
    "name": "Item name",
    "price": 400,
    "messages": ["0", "2"],
    "mod_id": "",
    "mod_name": "",
    "mod_price": 0,
    "mod_ini_cnt": 0,
    "mod_guid": "",
    "drk_id": "",
    "drk_name": "",
    "drk_price": 0,
    "drk_guid": "",
    "popup": "",
    "notice": "",
    "arc_type": 0,
    "drk_type": 0,
    "main_type": 0,
    "state": 2
  }
}
```

Not found:

```json
{ "result": "NG" }
```

`state` meanings:

| Value | Meaning                                                                   |
| ----- | ------------------------------------------------------------------------- |
| `0`   | Unavailable; client should show a newly authored unavailable-item dialog. |
| `1`   | Not selectable or no-op.                                                  |
| `2`   | Available.                                                                |

Only one of `popup`, `notice`, or `arc_type > 0` should be active for a normal item. If more than one is active, the client may show a newly authored data-error dialog. If `alcohol_check === 1`, the client should show a restricted-item confirmation dialog, then call `put_alcohol.php` on confirmation.

## Shared HTML Hooks

Every app page should expose these hooks if it wants to support the legacy client behavior. The visual structure and text are not specified.

| Selector                     | Required behavior                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| `form#frm_ctrl`              | Main navigation form. `method="post"`, `action="./?{urlId}"`.                           |
| `#proc[name="proc"]`         | Current or next page action.                                                            |
| `#ctrl[name="ctrl"]`         | Secondary action, such as `number`, `add`, `clear`, `forced`, `reorder`, or `remember`. |
| `#sub_ctrl[name="sub_ctrl"]` | Optional sub-action. Empty by default.                                                  |
| `#cur_lang[name="cur_lang"]` | Current language id. Default `1`.                                                       |
| `#message[name="message"]`   | Optional semantic message payload. If non-empty, client may show a dialog and clear it. |
| `#shop-id`                   | Hidden shop id.                                                                         |
| `#table-no`                  | Hidden table id.                                                                        |
| `#token[name="token"]`       | Hidden token-like value.                                                                |

Footer navigation hooks:

| Selector         | Behavior                                                             |
| ---------------- | -------------------------------------------------------------------- |
| `#order-add`     | If not `.disabled`, check last-order state, then submit `proc=menu`. |
| `#order-list`    | If not `.disabled`, check last-order state, then submit `proc=main`. |
| `#order-history` | If not `.disabled`, submit `proc=history`.                           |
| `#after-call`    | If not `.disabled`, submit `proc=call`.                              |
| `#do-account`    | If not `.disabled`, submit `proc=account`.                           |

Dialog compatibility:

| API                                                           | Required behavior                                                                   |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `alert(message, okCallback)`                                  | Modal acknowledgement, then `okCallback()`. Text is implementation-defined.         |
| `confirm(message, okCallback, cancelCallback, reverse=false)` | Modal yes/no choice. `reverse` flips button order. Text is implementation-defined.  |
| `alcohol(title, message, okCallback, cancelCallback)`         | Restricted-item confirmation used by the menu page. Text is implementation-defined. |

If a modal is already active, duplicate modal requests may be ignored. The legacy hook `#base-overlay` may be used to detect this state, but its visual style is unspecified.

## Page Behavior

### `entry`

The `entry` page is the first visible page after a QR URL resolves to a table session. It is a start-order page for a newly opened or not-yet-started table. It should be rendered, not skipped, on first QR access.

Required hooks:

| Selector                       | Behavior                                                |
| ------------------------------ | ------------------------------------------------------- |
| `form.top-page`                | Page form. The form action is `./?{urlId}`.             |
| `#proc[name="proc"]`           | Initial value `top`.                                    |
| `#ctrl[name="ctrl"]`           | Empty by default.                                       |
| `#header > h1`                 | Submit `proc=top` when activated.                       |
| `#shop-id`                     | Hidden shop id for Ajax `sid`.                          |
| `#table-no`                    | Hidden table id for Ajax `tno`/`tbl`.                   |
| `.global`                      | Language picker toggle.                                 |
| `#language > li[data-lang-id]` | Write selected language id to `#cur_lang`, then submit. |
| `#order`                       | Start order flow.                                       |
| `#number`                      | Change party size flow and table/party-size hook.       |
| `#order-list.disabled`         | Cart tab starts disabled before an order is active.     |

Initial state:

1. `body.start` should be present before the order-started status check completes.
2. The visible table/party-size hook should reflect the table id and the current party size. If the party size has not been selected yet, displaying zero or an unset equivalent is acceptable.
3. The cart is empty.
4. `#order-add`, `#order-history`, `#after-call`, and `#do-account` may be visible. `#order-list` should be disabled while no active cart is available.
5. The page loads the same client behavior as the `top` page.

On load, call `check_order.php` with `sid` and `tno`. If `result` is `OK`, remove `body.start`; otherwise keep or add `body.start`.

`#order` flow:

1. POST `check_lastorder.php` with `sid`.
2. If `OK`, show a newly authored last-order-closed dialog, then submit `proc=account`, `ctrl=clear`.
3. Otherwise POST `check_midnight.php` with `sid`.
4. If `OK`, show a newly authored extra-charge dialog, then submit `proc=number`.
5. On `NG` or Ajax failure, submit `proc=number`.

`#number` flow:

1. POST `check_lastorder.php` with `sid`.
2. If `OK`, show a newly authored last-order-closed dialog, then submit `proc=account`, `ctrl=clear`.
3. Otherwise submit `proc=number`, `ctrl=forced`.

After a form submission away from `entry`, the next page is determined by the posted `proc` value. The server does not need to preserve a separate `entry` state after the first transition.

### `top`

Required hooks:

| Selector                       | Behavior                                                |
| ------------------------------ | ------------------------------------------------------- |
| `form.top-page`                | Page form.                                              |
| `#header > h1`                 | Submit `proc=top` when activated.                       |
| `.global`                      | Language picker toggle.                                 |
| `#language > li[data-lang-id]` | Write selected language id to `#cur_lang`, then submit. |
| `#order`                       | Start order flow.                                       |
| `#number`                      | Change party size flow.                                 |

On load, call `check_order.php` with `sid` and `tno`. If `result` is `OK`, remove `body.start`; otherwise add `body.start`.

`#order` flow:

1. POST `check_lastorder.php` with `sid`.
2. If `OK`, show a newly authored last-order-closed dialog, then submit `proc=account`, `ctrl=clear`.
3. Otherwise POST `check_midnight.php` with `sid`.
4. If `OK`, show a newly authored extra-charge dialog, then submit `proc=number`.
5. On `NG` or Ajax failure, submit `proc=number`.

`#number` flow:

1. POST `check_lastorder.php` with `sid`.
2. If `OK`, show a newly authored last-order-closed dialog, then submit `proc=account`, `ctrl=clear`.
3. Otherwise submit `proc=number`, `ctrl=forced`.

### `number`

Required hooks:

| Selector                 | Behavior                                         |
| ------------------------ | ------------------------------------------------ |
| `form.number-page`       | Page form.                                       |
| `#number[name="number"]` | Hidden selected party size.                      |
| `.number`                | Add/remove `.enter` for manual party-size entry. |
| `.btn.num:not(.ent)`     | Preset party-size buttons. Id format is `no{n}`. |
| `.btn.num.ent`           | Enter manual mode.                               |
| `#nox`                   | Manual party-size input.                         |
| `#back`                  | Exit manual mode.                                |
| `#decide`                | Confirm manual size.                             |

Preset size flow:

1. Read `n` from clicked element id `no{n}`.
2. Accept only `1 <= n <= 8`.
3. Show a newly authored confirmation dialog.
4. On confirmation, set `#number=n`, `proc=menu`, `ctrl=number`, then submit.

Manual size flow:

1. `.btn.num.ent` adds `.number.enter`.
2. `#back` removes `.number.enter`.
3. `#decide` parses `#nox`.
4. Accept only `1 <= n <= 99`.
5. On confirmation, set `#number=n`, `proc=menu`, `ctrl=number`, then submit.

On POST with `proc=menu`, `ctrl=number`, and `number`, update `peopleCount` and set `peopleCountRegistered=true` for the shared table session.

### `menu`

Required hooks:

| Selector                                      | Behavior                                                            |
| --------------------------------------------- | ------------------------------------------------------------------- |
| `form.menu-page`                              | Page form.                                                          |
| `#session-id`                                 | Sent as `ssid`.                                                     |
| `#number`                                     | Current party size.                                                 |
| `#drinkbar-cnt[name="drinkbar-cnt"]`          | Legacy count hook.                                                  |
| `#alcohol-cnt[name="alcohol-cnt"]`            | Legacy count hook.                                                  |
| `#ord-drkbar-cnt[name="ord-drkbar-cnt"]`      | Legacy count hook.                                                  |
| `#is_reorder[name="is_reorder"]`              | Reorder flag.                                                       |
| `#order-time[name="order-time"]`              | Submit timestamp in `YYYY/MM/DD,HH:mm:ss`.                          |
| `#body-section.base`                          | Add `.detail` during quantity selection.                            |
| `.menu .command .name`                        | Item name preview.                                                  |
| `.menu .command #order`                       | Enter quantity selection.                                           |
| `#enter`                                      | Entered item code. Empty display may use `&nbsp;`.                  |
| `.tenkey li[data-val]`                        | Numeric keypad.                                                     |
| `.tenkey li.clear`                            | Clear hook; legacy behavior was effectively no-op.                  |
| `.tenkey li.del`                              | Delete one digit and set `#is_reorder=0`.                           |
| `.notice-balloon span`                        | Optional item notice hook.                                          |
| `.detail .main #code[name="code"]`            | Item code submitted to the server.                                  |
| `.detail .main #amount[name="amount"]`        | Item quantity, `1..99`.                                             |
| `.detail .mod #mod_code[name="mod_code"]`     | Modifier item code.                                                 |
| `.detail .mod #mod_amount[name="mod_amount"]` | Modifier quantity, `0..99`.                                         |
| `.detail .mod #guide .msg-base span`          | Optional modifier guidance hook.                                    |
| `.detail .command #back`                      | Exit quantity selection or return to top for special sub-actions.   |
| `.detail .command #deside`                    | Confirm item. Keep the misspelled id for compatibility.             |
| `audio#notice-sound`                          | Optional notice sound hook. Custom audio is implementation-defined. |

Numeric input flow:

1. Append the clicked `data-val` to `#enter`.
2. Accept only four digits. If input would exceed four digits, show a newly authored invalid-code dialog and do not proceed.
3. When the code reaches four digits, call `get_item.php`.

Item lookup flow:

1. POST `sid`, `tno`, `lng`, `id`, `num`, and `ssid` to `get_item.php`.
2. If `result` is `NG`, show a newly authored not-found dialog.
3. If Ajax fails, show a newly authored generic lookup-error dialog.
4. If `state=0`, show a newly authored unavailable dialog.
5. If `state=2`, populate item and modifier hooks from `item_data`.
6. If `popup` exists, show a newly authored confirmation dialog keyed to the popup data.
7. If `notice` exists, populate `.notice-balloon span` and show the notice UI.
8. If `alcohol_check=1`, show restricted-item confirmation and call `put_alcohol.php` on confirmation.

Item confirmation flow:

1. `.menu .command #order` requires a four-digit code.
2. Add `.detail` to `#body-section.base`.
3. `#minus` and `#plus` adjust quantities. Main item range: `1..99`; modifier range: `0..99`.
4. `#back` removes `.detail` unless `#sub_ctrl` is `add_drink`, in which case submit `proc=top`.
5. `#deside` validates a four-digit code.
6. If `#sub_ctrl` is `add_drink`, submit `proc=order`, `sub_ctrl=add_drink`, and set `#ord-drkbar-cnt` from `#amount`.
7. Otherwise set `#order-time`, `proc=main`, `ctrl=add`, then submit.

On POST with `proc=main`, `ctrl=add`, and item fields, append a cart line and set `orderStarted=true`.

### `main`

Required hooks:

| Selector                                                              | Behavior                 |
| --------------------------------------------------------------------- | ------------------------ |
| `form.main-page`                                                      | Page form.               |
| `#code[name="code"]`                                                  | Optional item code hook. |
| `#number`                                                             | Current party size.      |
| `#drinkbar-cnt`, `#alcohol-cnt`, `#ord-drkbar-cnt`, `#is-first-order` | Legacy hidden hooks.     |
| `div.list table tbody`                                                | Cart rows.               |
| `.amount p.count span`                                                | Total item count.        |
| `.amount p.amount span`                                               | Total price.             |
| `.command #menu`                                                      | Add more items.          |
| `.command #order`                                                     | Submit current cart.     |
| `div.list div.name>span`, `.del`                                      | Remove row hooks.        |
| `.minus`, `.plus`                                                     | Quantity controls.       |

Back-forward cache flow:

If `pageshow` indicates browser back navigation, clear the visible cart rows and visible totals, then show a newly authored cart-reset dialog. This visible reset is a client behavior; server state compatibility may be handled separately.

Row removal and quantity flow:

1. Remove-row hooks show a newly authored remove confirmation.
2. On confirmation, remove the row and recalculate totals.
3. `.minus` decrements the adjacent input. Inputs with `.zero` have minimum `0`; others have minimum `1`.
4. `.plus` increments up to `99`.

Submit flow:

1. `.command #menu` checks last-order state. If clear, submit `proc=menu`.
2. `.command #order` sums item quantities.
3. If last-order state is closed, show a newly authored last-order dialog and submit `proc=account`, `ctrl=clear`.
4. If total quantity is less than one, show a newly authored empty-cart dialog.
5. Otherwise show a newly authored submit confirmation.
6. On confirmation, set `proc=order` and submit.

On POST with `proc=order`, read:

| Field               | Meaning              |
| ------------------- | -------------------- |
| `item[id][]`        | Item ids.            |
| `item[count][]`     | Quantities.          |
| `item[reorder][]`   | Reorder flags.       |
| `item[mod_id][]`    | Modifier ids.        |
| `item[mod_count][]` | Modifier quantities. |

Then append the submitted order, clear `cart`, set `orderStarted=true`, set page to `call`, and render the call page.

### `history`

Required hooks:

| Selector                | Behavior                |
| ----------------------- | ----------------------- |
| `form.history-page`     | Page form.              |
| `#code[name="code"]`    | Reorder target item id. |
| `.list table tbody`     | Submitted-order rows.   |
| `.reorder.red[data-id]` | Reorder action.         |
| `.amount p.count span`  | Submitted total count.  |
| `.amount p.amount span` | Submitted total price.  |

Render submitted orders grouped by item id, modifier id, and modifier count. Each row must include item name, quantity, price, and an action element matching `.reorder.red[data-id="{itemId}"]`. The action text is implementation-defined.

When `.reorder` is activated, set `#code` from `data-id`, set `proc=menu`, `ctrl=reorder`, and submit. If last-order checks are implemented for this path, use the same closed-state behavior as other order-entry actions.

### `call`

Required hooks:

| Selector                        | Behavior                                                |
| ------------------------------- | ------------------------------------------------------- |
| `form.call-page`                | Page form.                                              |
| `.call ul[data-shop][data-tbl]` | Source for `sid` and `tbl`.                             |
| `#call-staff`                   | Normal staff call.                                      |
| `#call-after`                   | After-service call. Ignore activation when `.disabled`. |

`#call-staff:not(.disabled)` posts `sid`, `tbl`, `aft=false` to `tbl_call.php`.

`#call-after:not(.disabled)` posts `sid`, `tbl`, `aft=true` to `tbl_call.php`.

On success, show a newly authored success dialog and then submit `proc=top` either after acknowledgement or after a timeout. On failure, show a newly authored failure dialog.

### `account`

Required hooks:

| Selector                | Behavior              |
| ----------------------- | --------------------- |
| `form.account-page`     | Page form.            |
| `.list table tbody`     | Submitted-order rows. |
| `.amount p.count span`  | Total count.          |
| `.amount p.amount span` | Total price.          |
| `.command #decide`      | Proceed to receipt.   |

Render submitted orders grouped by item id, modifier id, and modifier count. Unlike `history`, no reorder action is required.

When `.command #decide` is activated, set `proc=receipt` and submit.

### `receipt`

Required hooks:

| Selector            | Behavior                     |
| ------------------- | ---------------------------- |
| `form.receipt-page` | Page form.                   |
| `p.table`           | Table id display hook.       |
| `.barcode img`      | Optional barcode image hook. |
| `.barcode p`        | Receipt/barcode value hook.  |

When rendering receipt, set `receiptShown=true`, replace `p.table` with the table id, and set `.barcode p` to a 12-character checkout code:

1. Map each character of `sessionId` to `charCode % 10`.
2. Concatenate those digits.
3. Take the first six digits and right-pad with `0` if needed.
4. Prefix `shopId` as a three-digit zero-padded value.
5. Prefix `tableId` as a three-digit zero-padded value.
6. Truncate the final string to 12 characters.

## HTML Rewrite Requirements

Before returning a page, the server should rewrite these values:

1. Replace every `action="./?..."`
   with `action="./?{nextId}"`.
2. Replace every `data-shop="..."`
   with the current `shopId`.
3. Replace every `data-tbl="..."`
   with the current `tableId`.
4. Set `#shop-id` value to `shopId`.
5. Set `#table-no` value to `tableId`.
6. Set `#session-id` value to `sessionId`.
7. Set `#number` value to `peopleCount`.
8. Set hidden `name="token"` value to `token`.
9. If rendering `entry`, expose the current table id and initial party-size state in the visible `#number` hook, keep the cart empty, and render the page as a start-order page.
10. If rendering `history`, replace submitted-order rows and totals.
11. If rendering `account`, replace submitted-order rows and totals.
12. If rendering `receipt`, replace table id and checkout code.

## Compatibility-Critical Identifiers

These identifiers are part of the compatibility surface. A clean-room UI may style and label them differently, but should keep them when legacy client behavior is expected.

| Area          | Identifiers                                                                                                                                                                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Form          | `#frm_ctrl`                                                                                                                                                                                                                                           |
| Hidden fields | `#proc`, `#ctrl`, `#sub_ctrl`, `#cur_lang`, `#message`, `#shop-id`, `#table-no`, `#session-id`, `#number`, `#token`, `#code`, `#amount`, `#mod_code`, `#mod_amount`, `#order-time`, `#is_reorder`, `#drinkbar-cnt`, `#alcohol-cnt`, `#ord-drkbar-cnt` |
| Entry         | `form.top-page`, `body.start`, `.global`, `#language`, `#language > li[data-lang-id]`, `#order`, `#number`, `#order-list.disabled`                                                                                                                    |
| Top           | `.global`, `#language`, `#language > li[data-lang-id]`, `#order`, `#number`                                                                                                                                                                           |
| Number        | `.number`, `.number.enter`, `.btn.num`, `.btn.num.ent`, `#nox`, `#back`, `#decide`                                                                                                                                                                    |
| Menu          | `#body-section.base`, `.base.detail`, `.menu`, `.detail`, `#enter`, `.tenkey li[data-val]`, `li.clear`, `li.del`, `.notice-balloon`, `#guide`, `#minus`, `#plus`, `#back`, `#deside`, `#notice-sound`                                                 |
| Main          | `div.list table tbody`, `div.name>span`, `.del`, `.minus`, `.plus`, `.amount p.count span`, `.amount p.amount span`, `.command #menu`, `.command #order`                                                                                              |
| History       | `.reorder.red[data-id]`, `.list table tbody`                                                                                                                                                                                                          |
| Call          | `.call ul[data-shop][data-tbl]`, `#call-staff`, `#call-after`                                                                                                                                                                                         |
| Account       | `.command #decide`, `.list table tbody`                                                                                                                                                                                                               |
| Receipt       | `p.table`, `.barcode img`, `.barcode p`                                                                                                                                                                                                               |
| Footer        | `ul#menu`, `#order-add`, `#order-list`, `#order-history`, `#after-call`, `#do-account`, `.disabled`, `.selected`, `.find`, `.count`                                                                                                                   |
| Dialog state  | `#base-overlay`, `.ui-dialog-buttonset>button:last-child`, `.notice-balloon .ui-dialog-buttonset button`                                                                                                                                              |

Notes:

1. Some legacy pages used duplicate ids such as `#menu` in different regions. For compatibility, selector behavior should be tested with the same hook names even if the clean-room DOM is simpler.
2. The menu confirmation hook is intentionally `#deside`; the account confirmation hook is `#decide`.
3. Text content for buttons and dialogs is not part of this spec.

## Flow Summary

| Origin    | Operation                   | Ajax                                 | Submitted fields                                                    | Result page |
| --------- | --------------------------- | ------------------------------------ | ------------------------------------------------------------------- | ----------- |
| QR        | First access                | none                                 | none                                                                | `entry`     |
| `entry`   | Start ordering              | `check_lastorder`, `check_midnight`  | `proc=number`                                                       | `number`    |
| `entry`   | Change party size           | `check_lastorder`                    | `proc=number`, `ctrl=forced`                                        | `number`    |
| `top`     | Start ordering              | `check_lastorder`, `check_midnight`  | `proc=number`                                                       | `number`    |
| `top`     | Change party size           | `check_lastorder`                    | `proc=number`, `ctrl=forced`                                        | `number`    |
| `number`  | Preset size                 | none                                 | `proc=menu`, `ctrl=number`, `number=n`                              | `menu`      |
| `number`  | Manual size                 | none                                 | `proc=menu`, `ctrl=number`, `number=n`                              | `menu`      |
| `menu`    | Confirm item                | `get_item`, optionally `put_alcohol` | `proc=main`, `ctrl=add`, `code`, `amount`, `mod_code`, `mod_amount` | `main`      |
| `main`    | Add more                    | `check_lastorder`                    | `proc=menu`                                                         | `menu`      |
| `main`    | Submit cart                 | `check_lastorder`                    | `proc=order`, `item[...][]`                                         | `call`      |
| footer    | Add more                    | `check_lastorder`                    | `proc=menu`                                                         | `menu`      |
| footer    | Open cart                   | `check_lastorder`                    | `proc=main`                                                         | `main`      |
| footer    | Open history                | none                                 | `proc=history`                                                      | `history`   |
| footer    | Open call page              | none                                 | `proc=call`                                                         | `call`      |
| footer    | Open account page           | none                                 | `proc=account`                                                      | `account`   |
| `history` | Reorder                     | optional `check_lastorder`           | `proc=menu`, `ctrl=reorder`, `code={id}`                            | `menu`      |
| `call`    | Staff or after-service call | `tbl_call`                           | `proc=top`                                                          | `top`       |
| `account` | Proceed to receipt          | none                                 | `proc=receipt`                                                      | `receipt`   |
| header    | Return top                  | none                                 | `proc=top`                                                          | `top`       |

When last-order state is closed, order-entry paths submit `proc=account`, `ctrl=clear`. Many historical Ajax failure paths continued optimistically to the intended page; preserve that behavior unless a test explicitly requires stricter handling.

## Static Asset Compatibility

A clean-room implementation may serve original-path-compatible placeholder assets. Do not copy historical images, CSS, or generated JavaScript.

| Path pattern                                                                                  | Compatibility purpose                                                                        |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `/data/{shopId}/img/logo.png`                                                                 | Top-page image hook. Serve a new placeholder or project-owned asset.                         |
| `/data/{shopId}/img/logo-mini.png`                                                            | Menu-page image hook. Serve a new placeholder or project-owned asset.                        |
| `/data/common/1/custom.css`                                                                   | Optional custom CSS hook.                                                                    |
| `/src/page/css/foundation.min.css`                                                            | Optional framework CSS hook.                                                                 |
| `/src/page/css/base.css.php`                                                                  | Base CSS compatibility hook.                                                                 |
| `/src/page/css/{top,number,menu,main,history,call,account,receipt}.css`                       | Page CSS compatibility hooks.                                                                |
| `/src/page/img/info.svg`                                                                      | Notice icon hook. Use a new icon.                                                            |
| `/src/page/img/ico-staff.svg`, `/src/page/img/ico-desert.svg`, `/src/page/img/ico-global.svg` | Optional icon hooks. Use new icons.                                                          |
| `/src/page/js/base.js.php?JS={page}.js.php`                                                   | Optional JS compatibility hook. If implemented, serve newly written code matching this spec. |
