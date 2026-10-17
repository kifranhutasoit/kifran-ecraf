import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "auto";

const NEXT: Record<ThemeMode, ThemeMode> = { light: "dark", dark: "auto", auto: "light" };

function readStoredMode(): ThemeMode {
	try {
		const stored = window.localStorage.getItem("theme");
		if (stored === "light" || stored === "dark" || stored === "auto") return stored;
	} catch {
		// Storage can be blocked (private mode). Fall back to system preference.
	}
	return "auto";
}

function applyThemeMode(mode: ThemeMode) {
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
}

export default function ThemeToggle() {
	const [mode, setMode] = useState<ThemeMode>("auto");

	useEffect(() => {
		const initial = readStoredMode();
		setMode(initial);
		applyThemeMode(initial);
	}, []);

	useEffect(() => {
		if (mode !== "auto") return;
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => applyThemeMode("auto");
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	}, [mode]);

	function toggleMode() {
		const next = NEXT[mode];
		setMode(next);
		applyThemeMode(next);
		try {
			window.localStorage.setItem("theme", next);
		} catch {
			// Preference simply won't persist.
		}
	}

	const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;
	const label = `Theme: ${mode === "auto" ? "system" : mode}. Switch to ${NEXT[mode]}.`;

	return (
		<button
			type="button"
			onClick={toggleMode}
			aria-label={label}
			title={label}
			className="inline-flex size-9 items-center justify-center rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] text-[var(--sea-ink)] transition hover:-translate-y-0.5 hover:bg-[var(--link-bg-hover)] focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none"
		>
			<Icon className="size-4" aria-hidden="true" />
		</button>
	);
}
