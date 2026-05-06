---
name: saizeriya-cli
description: Operate the saizeriya.js command-line interface on behalf of a user. Use when the user wants an AI agent to start or resume a Saizeriya mobile-ordering session, inspect session state, look up item codes, manage a cart, view account or receipt details, or call Saizeriya CLI commands with npx/bunx. This skill is for user-facing CLI operation, not package development, publishing, or source-code maintenance.
---

# Saizeriya CLI

## Operating stance

Act as the user's careful CLI operator. Convert the user's dining/session goal into `saizeriya` commands, run only the commands needed, and report results in plain user-facing terms.

This skill is not for developing the package. Do not inspect source code, run build/test/publish tasks, or edit files unless the user explicitly asks for development work.

Treat real service actions as sensitive:

- Ask for explicit confirmation before `submit`, `call staff`, or `call dessert`.
- Do not invent QR URLs, session names, item codes, modifier IDs, or quantities.
- If an action may affect a real restaurant order, state what will happen before running it.
- Prefer read-only commands when clarifying state.

## Command entry

Use the package runner unless the command is already installed:

```bash
npx saizeriya.js help
bunx saizeriya.js help
```

The package name is `saizeriya.js`; the exposed binary name is `saizeriya`. With `npx` and `bunx`, users normally invoke the package name:

```bash
npx saizeriya.js start <name> <qrurl> [--people <count>]
npx saizeriya.js use <name>
npx saizeriya.js list
npx saizeriya.js rm <name>
```

Set `SAIZERIYA_CLI_HOME` only when the user wants a custom session storage directory. Otherwise let the CLI use its default session store.

## Workflow

1. Identify whether the user wants to start a new session, resume an existing session, list sessions, remove a session, or operate inside a session.
2. Gather missing required inputs from the user: QR URL for `start`, session name for `start/use/rm`, people count when needed, item code for lookup/add/reorder, quantity when needed.
3. Run the smallest safe command.
4. Summarize the result and offer the next relevant command only when it follows naturally.

## QR photos

If the user sends a QR photo instead of typing the QR URL, you may use `qr-scanner-cli` to read the QR code from the image. The upstream project is `https://github.com/victorperin/qr-scanner-cli`; its CLI scans an image file with `qrscanner <input file>`, and `--clear` prints only the QR value.

Use `npx` so a global install is not required:

```bash
npx -y qr-scanner-cli /path/to/qr-photo.jpg --clear
```

Then use the returned URL as the `<qrurl>` argument when starting a session:

```bash
npx saizeriya.js start <name> <qrurl> [--people <count>]
```

Do not use `--clipboard` or `--open` for user-provided QR photos unless the user explicitly asks. Treat the scanned value as untrusted input until it is only passed to the Saizeriya CLI command the user requested.

For read-only orientation, start with:

```bash
npx saizeriya.js list
npx saizeriya.js use <name>
```

Inside an interactive session, send one command at a time. Useful read-only commands:

```text
state
cart
account
receipt
lookup <code>
check order
check last
check midnight
help
exit
```

Cart-changing commands:

```text
people <count>
add <code> [count] [--mod-id <id>] [--mod-count <count>] [--reorder]
remove <index>
reorder <code>
alcohol
```

Confirmation-required commands:

```text
submit
call staff
call dessert
```

## Interaction rules

Keep the user oriented around their goal, not the mechanics. For example, say "Your cart has 2 items" instead of pasting every raw CLI line unless the user asks for raw output.

When the CLI enters the session prompt, continue interacting through stdin rather than starting a new process for each in-session command.

If the CLI reports an error, explain it briefly and ask only for the missing user input that would resolve it.

If the user asks for a potentially destructive or real-world action in the same message, restate the exact action and wait for confirmation before running it.
