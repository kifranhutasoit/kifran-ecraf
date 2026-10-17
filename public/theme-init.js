// Applies the saved light/dark/auto theme before first paint (avoids a flash).
// Static file on purpose: no inline script, so no dangerouslySetInnerHTML.
(() => {
	try {
		const stored = window.localStorage.getItem("theme");
		const mode = stored === "light" || stored === "dark" || stored === "auto" ? stored : "auto";
		const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		const resolved = mode === "auto" ? (prefersDark ? "dark" : "light") : mode;
		const root = document.documentElement;
		root.classList.remove("light", "dark");
		root.classList.add(resolved);
		if (mode === "auto") {
			root.removeAttribute("data-theme");
		} else {
			root.setAttribute("data-theme", mode);
		}
		root.style.colorScheme = resolved;
	} catch {
		// Ignore: the page still renders with the default theme.
	}
})();
