export default function Footer() {
	const year = new Date().getFullYear();
	return (
		<footer className="site-footer w-full p-4 text-right text-sm text-[var(--sea-ink-soft)]">
			<p className="m-0">&copy; {year} Ekraf Dashboard. Built with TanStack Start.</p>
		</footer>
	);
}
