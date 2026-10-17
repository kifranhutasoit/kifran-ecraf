export default function Footer() {
	const year = new Date().getFullYear();
	return (
		<footer className="border-t border-[var(--line)] px-4 py-8 text-sm text-[var(--sea-ink-soft)]">
			<div className="page-wrap flex flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
				<p className="m-0">&copy; {year} Ekraf Dashboard</p>
				<p className="m-0 island-kicker">Built with TanStack Start</p>
			</div>
		</footer>
	);
}
