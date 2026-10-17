import { ImageIcon } from "lucide-react";

import { cn } from "#/lib/utils";

/** Product image, or a neutral placeholder. The name is shown beside it, so alt is empty. */
export function ProductThumb({
	src,
	size = "size-11",
}: {
	src: string | null;
	size?: string;
}) {
	const base = cn("shrink-0 rounded-lg ring-1 ring-[var(--line)]", size);
	if (src) {
		return <img src={src} alt="" loading="lazy" className={cn(base, "object-cover")} />;
	}
	return (
		<span
			aria-hidden="true"
			className={cn(base, "flex items-center justify-center bg-[var(--chip-bg)]")}
		>
			<ImageIcon className="size-4 text-[var(--sea-ink-soft)]" />
		</span>
	);
}

export function StockBadge({ value }: { value: number }) {
	const tone =
		value === 0
			? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
			: value <= 5
				? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
				: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
	const label = value === 0 ? "Out of stock" : value <= 5 ? `Low · ${value}` : `${value}`;
	return (
		<span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", tone)}>
			{label}
		</span>
	);
}
