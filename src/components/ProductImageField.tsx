import { ImageIcon, Trash2, Upload } from "lucide-react";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { fileToProductImageDataUrl } from "@/lib/image-resize";

export function ProductImageField({
	value,
	onChange,
	error,
}: {
	value: string | null;
	onChange: (value: string | null) => void;
	error?: string;
}) {
	const inputId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const [busy, setBusy] = useState(false);
	const [localError, setLocalError] = useState<string | null>(null);

	async function handleFile(file: File | undefined) {
		if (!file) return;
		setBusy(true);
		setLocalError(null);
		try {
			onChange(await fileToProductImageDataUrl(file));
		} catch (err) {
			setLocalError(err instanceof Error ? err.message : "Could not use that image.");
		} finally {
			setBusy(false);
			if (inputRef.current) inputRef.current.value = "";
		}
	}

	const message = localError ?? error;

	return (
		<div className="grid gap-2">
			<span
				id={`${inputId}-label`}
				className="text-sm leading-none font-medium text-[var(--sea-ink)]"
			>
				Product image
			</span>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
				<div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[var(--line)] bg-[var(--chip-bg)]">
					{value ? (
						<img src={value} alt="Product preview" className="size-full object-cover" />
					) : (
						<ImageIcon className="size-8 text-[var(--sea-ink-soft)]" aria-hidden="true" />
					)}
				</div>
				<div className="flex min-w-0 flex-col gap-2">
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => inputRef.current?.click()}
							disabled={busy}
							aria-describedby={`${inputId}-hint`}
						>
							<Upload className="size-3.5" aria-hidden="true" />
							{busy ? "Processing…" : value ? "Replace image" : "Upload image"}
						</Button>
						{value && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => onChange(null)}
								disabled={busy}
							>
								<Trash2 className="size-3.5" aria-hidden="true" />
								Remove
							</Button>
						)}
					</div>
					<p id={`${inputId}-hint`} className="m-0 text-xs text-[var(--sea-ink-soft)]">
						PNG, JPEG, WebP or GIF. Images larger than 512×512px are resized automatically.
					</p>
					<input
						ref={inputRef}
						id={inputId}
						type="file"
						accept="image/png,image/jpeg,image/webp,image/gif"
						className="sr-only"
						tabIndex={-1}
						aria-labelledby={`${inputId}-label`}
						onChange={(e) => void handleFile(e.target.files?.[0])}
					/>
				</div>
			</div>
			{message && (
				<p role="alert" className="m-0 text-xs text-red-600 dark:text-red-400">
					{message}
				</p>
			)}
		</div>
	);
}
