import { LogOut } from "lucide-react";
import { useState } from "react";

import { authClient } from "#/lib/auth-client";

export function UserAvatar({ name, email }: { name?: string | null; email?: string | null }) {
	const initial = (name || email || "?").trim().charAt(0).toUpperCase();
	return (
		<span
			aria-hidden="true"
			className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--chip-bg)] text-xs font-bold text-[var(--sea-ink)] ring-1 ring-[var(--chip-line)]"
		>
			{initial}
		</span>
	);
}

/** Sign-out button. Full reload afterwards so every server guard re-runs. */
export function SignOutButton({ className }: { className?: string }) {
	const [busy, setBusy] = useState(false);
	return (
		<button
			type="button"
			disabled={busy}
			onClick={async () => {
				setBusy(true);
				try {
					await authClient.signOut();
				} finally {
					window.location.assign("/login");
				}
			}}
			className={
				className ??
				"inline-flex h-9 items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 text-sm font-semibold text-[var(--sea-ink)] transition hover:bg-[var(--link-bg-hover)] disabled:opacity-60 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
			}
		>
			<LogOut className="size-4" aria-hidden="true" />
			{busy ? "Signing out…" : "Sign out"}
		</button>
	);
}
