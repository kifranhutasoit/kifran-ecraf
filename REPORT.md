# Ekraf Dashboard: Revamp, Fixes and Security Report

## 1. Summary

| Task | Status | Evidence |
|---|---|---|
| A. UI revamp | Done | Sidebar layout, modals, login redesign, dark mode, responsive pass, 512px image rule (client and server) |
| B. Fix errors | Done | `bun run lint` exit 0, `bun run build` exit 0, product inputs accept typing, all routes exercised in e2e |
| C. Security | Done (7 items, at least one per column) | Section 4, each with server-side placement |

Automated verification on the final tree:

- `bun run lint`: exit 0 (Biome, 61 files)
- `bun run build`: exit 0
- `tsc --noEmit`: clean
- End-to-end browser suite (Playwright, against the production build): **58/58 checks passed**

## 2. Brief vs. zip: what was missing and what I built

The brief assumed some pieces existed. In the uploaded zip they did not, so I built them:

- No `_admin` layout route. Added `src/routes/_admin.tsx` as the auth guard, plus `_public.tsx` for the public layout.
- No `components/ui/dialog.tsx`. Added a shadcn-style Dialog on the `radix-ui` package.
- No `ProductFormModal` or `UserRoleModal`. Built both with TanStack Form and server-side validation.
- No working login form. Rebuilt `/login` with sign-in and sign-up, client validation, and clear error states.
- The product "image URL" input was dropped. Accepting a remote URL means the server would fetch arbitrary URLs (SSRF risk) and could not verify the 512px cap without downloading. Only uploaded images are accepted now.

## 3. Task B: root causes of the bugs

1. **Product inputs could not be typed into.** The original form read values with `form.getFieldValue` during render. That call is not reactive, so the controlled inputs never updated. I reproduced this on the untouched original (`e2e/orig-typing.mjs`) and fixed it by moving every field to `form.Field` render props.
2. **Sorting did nothing.** TanStack Table's sorted row model was never registered (`sortedRowModel: createSortedRowModel()` was missing). Sorting now works in both directions and is verified.
3. **Crashes from hook order.** Conditional hooks in the product and user screens; removed.
4. **`Button asChild` links looked faded.** An unlayered global `a` colour rule overrode Tailwind utilities. Wrapped the rule in `@layer base`.
5. **Lint errors.** Four original errors plus issues introduced by new code (import order, semantic elements instead of `role=` on divs, index keys, `var` in the theme script, `@import` order). All fixed.
6. **Dependencies.** Removed `@faker-js/faker`, `@tanstack/match-sorter-utils` and the `cn` package, all unused. Removed `ui/slider.tsx`. Import paths now use `#/lib/utils`.
7. **Stale route tree and legacy routes.** Deleted the `/demo/*`, `/about` and scaffold routes and regenerated `routeTree.gen.ts` with `bunx tsr generate`. Legacy URLs (`/products/new`, `/products/:id`, `/users/:id`) redirect to their replacements.

## 4. Task C: security controls

The brief requires at least two items, one per column. Seven are listed. The "Where" column is the key point: every control is enforced on the server, because the client is untrusted.

| # | Column | Control | Where it runs | Why it is there |
|---|---|---|---|---|
| 1 | Auth / access control | `requireAuth()` and `requireAdmin()` on every product and user server function | `src/lib/session.ts`, `src/lib/server/products.ts`, `src/lib/server/users.ts` | Hiding buttons in the UI is not access control. The server checks the session and role on each call and returns 401 or 403. |
| 2 | Auth / access control | Self-protection: an admin cannot demote or delete their own account; the last administrator cannot be demoted | `src/lib/server/users.ts` (`updateUserRole`, `deleteUser`) | Prevents an admin from locking the app out. Verified by replaying the captured request, which the server rejects even though the UI disables the buttons. |
| 3 | Auth / access control | Deleting a user removes their account, sessions and role rows | `src/lib/server/users.ts` (`deleteUser`) | A deleted user's existing cookie stops working immediately. Verified in e2e. |
| 4 | Auth / access control | Open-redirect guard: `safeRedirectPath` only accepts same-origin paths (rejects `//`, `/\`, control characters, absolute URLs) | `src/lib/redirect.ts`, used in `_public/login.tsx` | Stops a crafted login link from sending users to an attacker's site. Verified with `https://evil.example` and `//evil.example`. |
| 5 | App hardening | Rate limiting on sign-in (10 per 15 min) and sign-up (10 per hour), plus a global limit | `src/lib/auth.ts` (`rateLimit.customRules`) | Slows password guessing. Verified: the 429 path returns "Too many attempts". |
| 6 | App hardening | Session cookie: `HttpOnly`, `SameSite=Lax`, `Secure` in production, 24-hour expiry; passwords at least 10 characters | `src/lib/auth.ts` | Cookie cannot be read by page scripts; limits CSRF exposure; short passwords rejected server-side (HTTP 400). |
| 7 | App hardening | Product images: magic-byte check (PNG, JPEG, WebP, GIF only), dimension parsing, 512px cap, byte limit; SVG and renamed files rejected | `src/lib/image.ts` (called from `src/lib/schemas.ts`) | An SVG or a spoofed file can carry script. The server checks the bytes, not the file name or MIME type. The client downscales to 512px, but that is only a convenience. |

Also in place: the seed admin password comes from the `SEED_ADMIN_PASSWORD` environment variable and is never in source or in the UI. The `/setup` page is idempotent and does not reveal the password. Input validation uses one Zod schema shared by client and server, and the server re-runs it on every request (`src/lib/validate.ts`), returning readable messages.

## 5. Test evidence

Commands run on the final tree:

```
bun run lint      # exit 0
bun run build     # exit 0
tsc --noEmit      # clean
node e2e.mjs      # 58/58 checks passed
```

The e2e suite covers the main routes (landing, login, setup, dashboard, products, users, legacy redirects), the create/edit/delete flows with validation and cancel, the 512px image rule (1024px upload downscaled to 512px; SVG and oversized images rejected by the server), non-admin access, replayed privileged requests (refused), mobile layout at 390px (no horizontal scroll on dashboard, products, users, login and the product modal), dark mode, sign-out, and rate limiting.

Screenshots from the run are in the scratchpad at `e2e/shots/` (desktop, mobile, drawer, dark mode, login).

## 6. Known limitations

- **In-memory store.** Data lives in process memory. It resets on restart and is not shared between serverless instances. The brief says not to add a database, so this is intentional, but production use would need one.
- **Rate limits are per instance** and count successful sign-ins as well as failed ones.
- **Product images are returned as data URLs** to every authenticated user, up to about 530 KB each. Acceptable for a small catalogue; a real store would serve images from storage.
- **Sign-up is open.** Anyone can create a regular account. Admin role can only be granted by an administrator.
- **No Content-Security-Policy header** is set yet.
- **Google Fonts** load from an external origin; in the sandbox they are blocked, which causes harmless `ERR_TUNNEL_CONNECTION_FAILED` console noise during tests.
- **The last-administrator check is defence in depth.** Because the acting user must already be an admin, the self-check usually triggers first.
- **Build warnings** about `"use client"` directives come from a third-party bundle, not this code.
- **`CHEATSHEET.md` is unchanged** and still shows the old seed credentials (`admin12345`). It is your checklist, so I did not edit it. Please remove that line before sharing the project, and rotate any deployment that used the old seed password.

## 7. Files not included in the deliverable

`node_modules`, `.output`, `.nitro`, `.tanstack` and `.env.local` are excluded. `.env.local` contains test values only and must not be committed. Use `.env.example` to create your own.
