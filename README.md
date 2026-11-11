# Clearspace

A calm, keyboard-first Getting Things Done workspace: capture into an inbox, decide one item at a time, keep projects moving.

- **Live:** https://clearspace-gtd.aqmhussein.workers.dev
- **Stack:** React 19 + Vite + Tailwind v4 (7Ovr/shadcn components on Base UI) · Hono on Cloudflare Workers · Cloudflare D1

## Run locally

```bash
npm install
npm run db:migrate:local   # applies schema + seed data to the local D1
npm run dev                # Worker on :8787, Vite on :5173 (proxies /tasks and /projects)
```

`npm run build && npx wrangler dev` serves the real production bundle on :8787.

## REST API

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/tasks` | `?status=inbox\|next\|waiting\|done` |
| POST | `/tasks` | `{ title, project_id? }` → 201, status `inbox` |
| GET | `/tasks/:id` | 404 when unknown |
| PATCH | `/tasks/:id` | `{ title?, status?, project_id? }` → full task |
| DELETE | `/tasks/:id` | 204 |
| GET | `/projects` | |
| POST | `/projects` | `{ name, status? }` → 201 |
| PATCH | `/projects/:id` | `{ name?, status? }` |
| DELETE | `/projects/:id` | 409 + `blocking_tasks` when tasks still reference it |

Validation failures return 400 with `error`, `message` and per-field `issues`.

## Keyboard

`n` new task · `?` shortcut help · in the inbox processor: `d` done, `w` waiting, `x` next, `p` assign to project, `→` skip.

## Tests

```bash
npm test        # API routes in the workerd runtime (D1-backed)
npm run test:e2e  # Playwright: desktop + Pixel 5
```

Playwright needs `CHROMIUM_PATH=/path/to/chrome` when the browser build is not the one it ships with.

## Deploy

```bash
npm run db:migrate:remote   # first deploy only
npm run deploy
```

Requires `CLOUDFLARE_ACCOUNT_ID` (or an account selected in Wrangler) and a `database_id` in `wrangler.jsonc`.
