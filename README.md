# saizeriya

[![技術者倫理 遵守済み](https://img.shields.io/badge/%E6%8A%80%E8%A1%93%E8%80%85%E5%80%AB%E7%90%86-%E9%81%B5%E5%AE%88%E6%B8%88%E3%81%BF-0a0a0a?style=for-the-badge&labelColor=ffffff)](https://技術者倫理.com)

> [!Warning]
>
> This is not officially endorsed by Saizeriya. It has no connection to the Saizeriya organization. Please use it with caution.

This repository includes a saizeriya-compatible server, client library, and client app.

## Setup

```bash
bun i
```

### Docker-free

```
bun install
bun run build # build packages/client & betterzeriya
bun run start # node apps/betterzeriya/build
```

## Compatible Server

```bash
cd packages/server
bun dev
```

You can see the dashboard at `/dashboard`.

## Client Library

A saizeriya client library written in JS/TS.

```bash
bun add saizeriya.js
```

And this includes CLI.

```bash
bunx saizeriya.js
# or
bun add -g saizeriya.js
saizeriya --help
```

## Agent Skills

```bash
bunx skills add pnsk-lab/saizeriya/skills
```

With agent skills, you can order dishes with AI Agents such as Claude Code and Codex.

## Betterzeriya: Client App

Betterzeriya is a 3rd-party client for saizeriya, with better UX and performance.

```bash
cd apps/betterzeriya
bun dev
```

### Usage

#### Run with Docker

```bash
docker pull ghcr.io/pnsk-lab/betterzeriya:latest
docker run --rm -p 3000:3000 ghcr.io/pnsk-lab/betterzeriya:latest
```

Then open `http://localhost:3000`.

To run it in the background:

```bash
docker run -d --name betterzeriya -p 3000:3000 ghcr.io/pnsk-lab/betterzeriya:latest
```

To stop it:

```bash
docker stop betterzeriya
```

Use a different host port by changing the left side of `-p`. For example,
`-p 8080:3000` serves the app at `http://localhost:8080`.

### Run manually

### Docker-free

```
bun install
bun run betterzeriya:build # build packages/client & betterzeriya
bun run betterzeriya:start # node apps/betterzeriya/build
```

### Deploy to Cloudflare Workers

```bash
bun i
cd apps/betterzeriya
CLOUDFLARE=1 bun run build
wrangler deploy
```

### Deploy to Cloudflare Pages

#### Via Wrangler CLI

```bash
bun i
bun run betterzeriya:deploy:pages
# or step by step:
#   bun run betterzeriya:build:pages
#   bun run --cwd apps/betterzeriya deploy:pages
```

The first run will prompt you to create a Pages project. Subsequent deploys reuse it.

To preview locally with the Pages runtime:

```bash
bun run betterzeriya:build:pages
bun run --cwd apps/betterzeriya preview:pages
```

#### Via Git integration (Cloudflare dashboard)

Connect this repository on the Cloudflare Pages dashboard and use the following settings:

| Field                  | Value                                             |
| ---------------------- | ------------------------------------------------- |
| Framework preset       | SvelteKit                                         |
| Build command          | `bun install && bun run betterzeriya:build:pages` |
| Build output directory | `apps/betterzeriya/.svelte-kit/cloudflare`        |
| Root directory         | `/` (repository root)                             |
| Environment variables  | `CLOUDFLARE=1`, `BUN_VERSION=1.3.10`              |

`BUN_VERSION` makes the Cloudflare build environment install bun. `bun install` must be run explicitly in the build command — Cloudflare does not auto-install dependencies for bun projects, and npm cannot resolve the `workspace:*` protocol used by this monorepo.

### Deploy to Vercel

Use the repository root as the Vercel project root. The included `vercel.json`
installs dependencies with Bun and builds Betterzeriya with the Vercel adapter.

```bash
bun i
bun run betterzeriya:build:vercel
```

For CLI deployment:

```bash
bunx vercel
bunx vercel --prod
```

For Git deployment, import the repository in Vercel and keep the project root at
the repository root. The build command is provided by `vercel.json`.

## Star History

<a href="https://www.star-history.com/?repos=pnsk-lab%2Fsaizeriya&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=pnsk-lab/saizeriya&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=pnsk-lab/saizeriya&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=pnsk-lab/saizeriya&type=date&legend=top-left" />
 </picture>
</a>

## Contributors

<a href="https://github.com/pnsk-lab/saizeriya/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=pnsk-lab/saizeriya" />
</a>
