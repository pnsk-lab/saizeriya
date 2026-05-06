# saizeriya.js

> [!WARNING]
> This package is for research and interoperability testing. It is an unofficial client for studying Saizeriya's mobile ordering flow, and it should not be used to disrupt, overload, bypass, or otherwise misuse any real service.

`saizeriya.js` provides a TypeScript client and a small interactive CLI for Saizeriya's mobile ordering pages.

## Install

```bash
npm i saizeriya.js
```

## CLI

Run the CLI directly with npm or Bun:

```bash
npx saizeriya.js help
bunx saizeriya.js help
```

Start a named session from a QR URL:

```bash
npx saizeriya.js start lunch "https://example.com/saizeriya3/qr" --people 2
```

The CLI stores session snapshots in `~/.saizeriya-cli/sessions.json` by default. Set `SAIZERIYA_CLI_HOME` to use another directory.

Top-level commands:

```text
saizeriya start <name> <qrurl> [--people <count>] [--browser] [--headless]
saizeriya use <name>
saizeriya list
saizeriya rm <name>
```

Inside a session, type `help` to see available commands. Common commands include:

```text
state
people <count>
lookup <code>
add <code> [count] [--mod-id <id>] [--mod-count <count>] [--reorder]
cart
remove <index>
submit
account
receipt
call [staff|dessert]
exit
```

## Library

```ts
import { createClient } from 'saizeriya.js'

const client = await createClient({
  qrURLSource: 'https://example.com/saizeriya3/qr',
  peopleCount: 2,
})

await client.addItem('1202')
console.log(client.getState().cart)
```

For tests or research fixtures, pass a custom `fetchSource`:

```ts
const client = await createClient({
  qrURLSource,
  fetchSource: (request) => fetch(request),
})
```

## Browser Mode

The CLI can also use browser mode:

```bash
BROWSER=1 npx saizeriya.js start lunch "https://example.com/saizeriya3/qr" --people 2
npx saizeriya.js start lunch "https://example.com/saizeriya3/qr" --browser
bunx saizeriya.js start lunch "https://example.com/saizeriya3/qr" --browser
```

`saizeriya.js/browser-mode` drives the page through Playwright and uses DOM interaction for
lookups, item entry, dialogs, cart submission, checkout, and calls. It does not call the
mobile-order command endpoints directly from the library; any network requests happen as a result
of the page's own JavaScript reacting to clicks.

Playwright is an optional dependency. Install optional dependencies, or install Playwright
alongside the package before using browser mode.

For one-shot npm execution in environments that skip optional dependencies, ask npm to install both
packages into the temporary exec environment:

```bash
npm exec --package saizeriya.js --package playwright -- saizeriya start lunch "https://example.com/saizeriya3/qr" --browser
```

`bunx saizeriya.js ... --browser` works when Bun installs optional dependencies for the package. If
your Bun environment omits optional dependencies, run the CLI from a project that has both
`saizeriya.js` and `playwright` installed.

Browser mode uses `CHROME_EXECUTABLE` first when launching Chromium. Without it, it looks for
common Chrome/Chromium executables on `PATH`, Ubuntu-style locations such as `/usr/bin/chromium`,
Snap's `/snap/bin/chromium`, and NixOS profile locations such as
`/run/current-system/sw/bin/chromium` and `~/.nix-profile/bin/chromium`.

```ts
import { createBrowserClient } from 'saizeriya.js/browser-mode'

const client = await createBrowserClient({
  qrURLSource: 'https://example.com/saizeriya3/qr',
  peopleCount: 2,
})

await client.addItem('1202', { count: 2 })
await client.submitOrder()
await client.close()
```

## Development

```bash
bun install
bun --cwd packages/client pack
bun run test
```
