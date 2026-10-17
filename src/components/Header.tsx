import { Link } from "@tanstack/react-router";

import { SignOutButton } from "#/integrations/better-auth/header-user";
import { authClient } from "#/lib/auth-client";

import ThemeToggle from "./ThemeToggle";

// Light-on-green pills for the green header bar.
const pillClass =
	"inline-flex h-9 items-center gap-2 rounded-lg border border-white/40 bg-white/10 px-4 text-sm font-semibold text-white no-underline transition hover:bg-white/20 hover:text-white disabled:opacity-60 outline-none focus-visible:ring-[3px] focus-visible:ring-white/60";

/** Top bar for public pages (home, sign-in, setup). */
export default function Header() {
	const { data: session, isPending } = authClient.useSession();

	return (
		<header className="bg-nav sticky top-0 z-50 shadow-lg">
			<nav className="page-wrap flex items-center justify-between gap-3 py-3" aria-label="Main">
				<Link
					to="/"
					className="text-2xl font-semibold uppercase text-white no-underline outline-none hover:text-gray-300 focus-visible:ring-[3px] focus-visible:ring-white/60"
				>
					Ekraf
				</Link>

				<div className="flex items-center gap-2">
					{!isPending &&
						(session?.user ? (
							<>
								<Link to="/dashboard" className={pillClass}>
									Dashboard
								</Link>
								<SignOutButton className={pillClass} />
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
