# Ekraf Dashboard (TanStack Start)

Secure admin dashboard with sign-in, product CRUD (with images) and user/role
management. Auth is Better Auth with an in-memory store (no database by design).
Targets Vercel. See `REPORT.md` for the design rationale and test results.

## Commands

| Command | Purpose |
|---|---|
| `bun install` | Install dependencies |
| `bun run dev` | Dev server on http://localhost:3000 |
| `bun run build` | Production build (Nitro `node-server` preset output in `.output/`) |
| `bun run lint` | Biome check (must pass) |
| `bun run format` | Biome format |
| `bunx tsr generate` | Regenerate `src/routeTree.gen.ts` after adding or removing route files |
| `bunx tsc --noEmit` | Type check |

## Environment (`.env.local`, gitignored; template in `.env.example`)

| Variable | Purpose | Required |
|---|---|---|
| `BETTER_AUTH_URL` | Public base URL (dev: `http://localhost:3000`) | Yes |
| `BETTER_AUTH_SECRET` | Session signing secret (`bunx @better-auth/cli secret`) | Yes |
| `SEED_ADMIN_PASSWORD` | Password for the first administrator, used only by `/setup`. At least 10 characters. Never committed or displayed. | Yes, before running setup |
| `SEED_ADMIN_EMAIL` | Email for the first administrator | No (default `admin@example.com`) |

On Vercel, set these under **Project Settings > Environment Variables**.

## First-time setup

1. Set `SEED_ADMIN_PASSWORD` in `.env.local` and restart the server.
2. Open `/setup` and click **Create administrator**. This creates the admin and three sample products. It does nothing if an administrator already exists.
3. Sign in at `/login`.

## Routes

| Route | Access | Notes |
|---|---|---|
| `/` | public | Landing page |
| `/login` | public | Sign in / create account. Honours `?redirect=` for in-app paths only |
| `/setup` | public | One-time admin seed (`seedAdmin` server function) |
| `/dashboard` | signed in | Overview. Admin-only stats are hidden for non-admins |
| `/products` | signed in (read); admin (write) | Sortable table on desktop, cards on mobile. Create/edit use a modal driven by `?new=1` or `?edit=<id>` |
| `/users` | admin | Role modal and delete confirmation. Non-admins are redirected to `/dashboard` |
| `/products/new`, `/products/$productId`, `/users/$userId` | redirects | Kept so old links still work |
| `/api/auth/$` | public | Better Auth HTTP handler |

Layouts: `_public.tsx` (public header/footer) and `_admin.tsx` (auth guard plus sidebar shell). Admin pages live under `src/routes/_admin/`.

## Architecture

- **Validation**: shared zod schemas in `src/lib/schemas.ts` are used by the server functions (authoritative) and the client forms (feedback only).
- **Authorization**: every server function calls `requireAuth()` or `requireAdmin()` (`src/lib/session.ts`). Route guards and hidden buttons are cosmetic.
- **Guardrails**: `updateUserRole` and `deleteUser` refuse self-changes and protect the last administrator (`src/lib/server/users.ts`).
- **Images**: `src/lib/image.ts` validates data URLs server-side (magic bytes, dimensions ≤ 512px, size cap, no SVG). `src/lib/image-resize.ts` downscales in the browser before upload.
- **Auth config**: `src/lib/auth.ts` sets session lifetime, cookie flags (`httpOnly`, `sameSite=lax`, `secure` in production), password length and sign-in rate limiting.
- **Data**: `src/lib/db.ts` is the in-memory store. Collections are mutated in place. Deleting a user also removes their sessions, credentials and role.
- **Forms**: TanStack Form. Fields use `form.Field` render props. Do not read values with `form.getFieldValue()` during render, because that does not subscribe to updates and the input stops accepting keystrokes.
- **Tables**: TanStack Table v9. Sorting needs `sortedRowModel: createSortedRowModel()` in `tableFeatures(...)`.
- **Dialogs**: `src/components/ui/dialog.tsx` (Radix Dialog). Used for modals, the mobile drawer and confirmations.
- **Theme**: `public/theme-init.js` applies the saved theme before first paint. No inline script.

## Known gotchas

- **Data resets** on every restart or redeploy, and each serverless instance has its own store. Re-run `/setup` after deploying. For real use, add a persistent Better Auth adapter.
- **Rate limiting** is per instance (memory). It counts successful sign-ins as well as failures.
- **`useParams()`** requires `{ from: '/path/$param' }` in this router version.
- **`createServerFn`** supports only `GET` and `POST`.
- **Better Auth API is flat**: `auth.api.signUpEmail(...)`.
- **Server errors** reach the client as an error payload (HTTP 200 on the wire), so handle them via thrown errors in `useMutation` or `try/catch`, not by status code.
- **Hooks**: never call hooks after an early return in a route component.

## Next steps

- Add a persistent database adapter (Drizzle, Prisma or Kysely) and `DATABASE_URL`.
- Serve product images from storage or thumbnails rather than embedding them in list responses.
- Add a Content-Security-Policy header and move external fonts to self-hosted files.
- Add an admin audit log.
