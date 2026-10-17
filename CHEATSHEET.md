# 🛠️ Assignment: Revamp · Fix · Secure

**Project:** TanStack Ekraf Dashboard — admin dashboard (login → product CRUD → user/role management), built with TanStack Start + Better Auth.
**Important:** no database by design — data lives in memory and resets on every restart.

---

## 1 · Getting Started

```bash
bun install
cp .env.example .env.local    # fill BETTER_AUTH_URL + BETTER_AUTH_SECRET
bun dev                       # http://localhost:3000
```

1. Visit `/setup` → click **Seed Admin Account** (creates `admin@example.com` / `admin12345` + sample products).
2. Sign in at `/demo/better-auth`.
3. Explore `/dashboard`, `/products`, `/users`.

> 💡 If something breaks, read the error carefully first — understanding *why* it broke is part of the grade.

---

## 2 · Codebase Map (skim before changing anything)

| Path | What it is |
|---|---|
| `src/routes/` | All pages (file-based routing, `routeTree.gen.ts` is generated). Admin-area pages live under the **`_admin` pathless layout route** (`DashboardShell` — auth guard + sidebar). Product create/edit & role changes are **modal dialogs**, not pages |
| `src/lib/auth.ts` | Better Auth config, `requireAuth()` / `requireAdmin()`, seed |
| `src/components/` | `Header`, `Footer`, `ThemeToggle`, shadcn `ui/` components, `ProductFormModal`, `UserRoleModal` |
| Server functions | `createProduct`, `updateProduct`, `deleteProduct`, `updateUserRole`, `deleteUser`, `getUsers` |

**Stack:** TanStack Start (React 19) · TanStack Router/Query/Form/Table · Better Auth (in-memory) · Tailwind + shadcn · Biome · bun.

### Routes to test

| Route | Access | Test it |
|---|---|---|
| `/`, `/login`, `/setup` | public | Renders, seed is idempotent |
| `/dashboard` | auth | Redirects to login when signed out; sidebar shell renders |
| `/products` | auth | List renders, sorting works; create/edit/delete modals open & save |
| `/users` | admin | Role change modal; last-admin lockout blocked; delete confirm dialog |

---

## 3 · Task A — UI Revamp (Required)

Improve at least **3 pages** (suggested: Home, Dashboard, Products).

- [ ] **Sidebar layout** for the dashboard area (Dashboard, Products, Users) with icons per nav item (e.g. `lucide-react`); collapsible + hamburger drawer on mobile — *already scaffolded in the `_admin` layout route, polish it*
- [ ] Create/Update actions already open in **popup modals** (`ProductFormModal`, `UserRoleModal`) — polish them: validation messages, cancel behavior, loading/submission states
- [ ] **Revamp the login page** — a clean, modern, on-brand sign-in card (centered layout, logo/title, subtle card shadow/border, dark-mode support, and clear error feedback for wrong credentials). First impression counts!
- [ ] **Remove the docs & demo pages** (`/demo/*`, `/about` and any scaffold demo routes) — the dashboard is a real product, not a scaffold tour. Delete the route files, run `bunx tsr generate`, and make sure nothing in `Header`/`Footer`/`__root.tsx` still links to them
- [ ] **Product image input** in the product modal — file picker or URL input with a preview; the image is capped at **max 512px** (reject or downscale larger images before saving). Validate it client-side for UX *and* keep a server-side check in `createProduct`/`updateProduct` (see Task C)
- [ ] Responsive at mobile width (no desktop-only tables)
- [ ] Consistent spacing / typography / colors; dark mode works via `ThemeToggle`
- [ ] Loading, empty, and error states on data pages
- [ ] Stick to Tailwind + existing shadcn `ui/` components — no framework swap

> 💡 shadcn's `dialog.tsx` is already in `src/components/ui/` — build your modals on it. After deleting route files, run `bunx tsr generate` so `routeTree.gen.ts` is updated, then confirm no dead links remain.

## 4 · Task B — Fix Errors (Required)

- [ ] `bun run lint` passes (fix known scaffold issues in `styles.css`, `__root.tsx`, `demo/`)
- [ ] **Product form inputs can't be typed into** (the create/edit product modal's fields reject keystrokes). Diagnose why — usually a broken controlled-input state (value never updating on each keystroke, or the form re-mounting). Fix it so all product fields accept and persist typing
- [ ] `bun run build` succeeds with zero errors
- [ ] Every route above manually tested + broken behavior fixed

**Known gotchas in this repo:**

- `useParams()` needs `{ from: '/path/$param' }` — bare call throws.
- `createServerFn` supports `GET`/`POST` only — no PATCH/DELETE.
- `/setup` must not crash if admin already exists (idempotent seeding).

## 5 · Task C — Security Enhancements (Required · min 2, one from each column)

### Auth / access control
- [ ] Every mutation calls `requireAdmin()` / `requireAuth()` — close missing ones
- [ ] Block self-role-demotion & self-deletion for admins
- [ ] Rate-limit login attempts

### App hardening
- [ ] Server-side Zod validation on every server function (client validation ≠ security)
- [ ] No `dangerouslySetInnerHTML` with user content (XSS)
- [ ] No secrets in code or git — `.env.local` only
- [ ] Session cookie flags: `httpOnly`, `sameSite`, timeout

**Bonus:** password strength/reset, admin action audit log, CSRF-safe fetch wrapper, sanitizing product fields.

> 🔒 Rule of thumb: **the client is untrusted.** Validate + authorize again on the server, every time.
> 🚫 Don't add a database, don't switch frameworks, don't remove auth checks because they "block" you, don't commit `.env.local`.

---

## 6 · Deliverables

- [ ] One branch → **Pull Request** with changes described per task
- [ ] `NOTES.md`: *"What I broke and how I fixed it"* (1 paragraph)
- [ ] Fresh clone + `bun install` + `/setup` works end-to-end
- [ ] Each security enhancement: 1–2 sentences on the attack it prevents
- [ ] `bun run build` passes, Biome clean

### Grading

| Criteria | Weight |
|---|---|
| UI revamp (quality, responsive, states) | 30% |
| Bug fixes (lint/build clean, routes correct) | 25% |
| Security (server-side placement + explanation) | 35% |
| Report quality + code hygiene | 10% |

---

## 7 · Command Cheatsheet

```bash
bun dev              # dev server on :3000
bun run lint         # biome check — find errors
bun run format       # biome format --write — fix style
bun run build        # must pass before submit
bunx tsr generate    # regenerate routeTree.gen.ts after route changes
```

Docs: [TanStack Start](https://tanstack.com/start) · [Router](https://tanstack.com/router) · [Form](https://tanstack.com/form) · [Biome](https://biomejs.dev) · [Better Auth](https://www.better-auth.com)

*Feel free to annotate & improve this sheet 🚀*
