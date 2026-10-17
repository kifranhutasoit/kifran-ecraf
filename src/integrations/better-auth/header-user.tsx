import { LogOut } from "lucide-react";
import { useState } from "react";

import { authClient } from "#/lib/auth-client";

export function UserAvatar({ name, email }: { name?: string | null; email?: string | null }) {
	const initial = (name || email || "?").trim().charAt(0).toUpperCase();
	return (
		<span
			aria-hidden="true"
			className="inline-flex size-full shrink-0 items-center justify-center rounded-full bg-[var(--palm)] text-sm font-bold text-white"
		>
			{initial}
		</span>
	);
}

/** Ends the session, then reloads on /login so every server guard re-runs. */
export async function signOutAndReload() {
	try {
		await authClient.signOut();
	} finally {
		window.location.assign("/login");
	}
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
				await signOutAndReload();
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
