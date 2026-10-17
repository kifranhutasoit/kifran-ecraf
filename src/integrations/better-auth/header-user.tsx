import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

import { authClient } from "#/lib/auth-client";

const btn =
	"inline-flex h-9 items-center rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] px-4 text-sm font-semibold text-[var(--sea-ink)] no-underline transition hover:bg-[var(--link-bg-hover)]";

export default function BetterAuthHeader() {
	const { data: session, isPending } = authClient.useSession();
	const router = useRouter();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	if (isPending) {
		return <div className="h-9 w-24 animate-pulse rounded-xl bg-[var(--chip-bg)]" />;
	}

	if (session?.user) {
		return (
			<div className="flex items-center gap-2">
				<Link to="/dashboard" className={btn}>
					Dashboard
				</Link>
				<button
					type="button"
					className={btn}
					onClick={async () => {
						await authClient.signOut();
						queryClient.clear();
						await router.invalidate();
						await navigate({ to: "/login" });
					}}
				>
					Sign out
				</button>
			</div>
		);
	}

	return (
		<Link to="/login" className={btn}>
			Sign in
		</Link>
	);
}
