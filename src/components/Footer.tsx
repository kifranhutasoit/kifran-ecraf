export default function Footer() {
	const year = new Date().getFullYear();

	return (
		<footer className="mt-20 border-t border-[var(--line)] px-4 pb-10 pt-8 text-[var(--sea-ink-soft)]">
			<div className="page-wrap flex flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
				<p className="m-0 text-sm">&copy; {year} Ekraf Dashboard. All rights reserved.</p>
				<p className="island-kicker m-0">Products &middot; Users &middot; Roles</p>
			</div>
		</footer>
	);
}
