# Ekraf Dashboard

A secure admin dashboard built with TanStack Start, Better Auth, TanStack Router, Query, Table and Form, plus Tailwind and shadcn-style components.

- Sign in, sign up and sessions (Better Auth, in-memory store)
- Products: sortable table, create and edit in a modal, product images (auto-resized to 512px), delete with confirmation
- Users: role changes and deletion, with guardrails against locking out or removing yourself
- Light, dark and system themes; responsive from phone to desktop

## Quick start

```bash
bun install
cp .env.example .env.local   # set BETTER_AUTH_SECRET and SEED_ADMIN_PASSWORD
bun run dev                  # http://localhost:3000
```

Then open `/setup`, create the administrator, and sign in at `/login`.

## Scripts

- `bun run dev`: development server
- `bun run build`: production build
- `bun run lint`: Biome check
- `bun run format`: Biome format

## Documentation

- `AGENTS.md`: commands, environment, routes and architecture
- `REPORT.md`: what changed, why, the security model and test results

## Deploying

Set `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` and `SEED_ADMIN_PASSWORD` in the hosting provider. The app is configured for Vercel (`vercel.json`). Data is in memory, so it resets on each cold start (see `AGENTS.md`).

## Design

The UI follows the [Tailwind Admin Template](https://github.com/davidgrzyb/tailwind-admin-template) by David Grzyb (Apache License 2.0): emerald-green sidebar (`#047857`, active `#065f46`), green-tinted canvas, white cards, deep-green striped tables, Karla font. The palette lives in `src/styles.css` (light and dark variants); the layout is in `src/components/AdminShell.tsx`.
