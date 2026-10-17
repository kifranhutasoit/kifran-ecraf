import { Link } from "@tanstack/react-router";

import { SignOutButton } from "#/integrations/better-auth/header-user";
import { authClient } from "#/lib/auth-client";

import ThemeToggle from "./ThemeToggle";

const pillClass =
	"inline-flex h-9 items-center rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-4 text-sm font-semibold text-[var(--sea-ink)] no-underline transition hover:bg-[var(--link-bg-hover)] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** Top bar for public pages (home, sign-in, setup). */
export default function Header() {
	const { data: session, isPending } = authClient.useSession();

	return (
		<header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] backdrop-blur-lg">
			<nav className="page-wrap flex items-center justify-between gap-3 py-3" aria-label="Main">
				<Link
					to="/"
					className="inline-flex items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--sea-ink)] no-underline"
				>
					<span className="size-2 rounded-full bg-[var(--palm)]" aria-hidden="true" />
					Ekraf Dashboard
				</Link>

				<div className="flex items-center gap-2">
					{!isPending &&
						(session?.user ? (
							<>
								<Link to="/dashboard" className={pillClass}>
									Dashboard
								</Link>
								<SignOutButton />
							</>
						) : (
							<Link to="/login" className={pillClass}>
								Sign in
							</Link>
						))}
					<ThemeToggle />
				</div>
			</nav>
		</header>
	);
}
