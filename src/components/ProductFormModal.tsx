import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ImageIcon, Trash2, Upload } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Product } from "@/lib/db";
import { MAX_IMAGE_SIDE } from "@/lib/image";
import { createProduct, updateProduct } from "@/lib/server/products";

/* ---------- helpers gambar (client-side, hanya untuk UX; server tetap memvalidasi ulang) ---------- */

async function fileToResizedDataUrl(file: File): Promise<string> {
	if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
		throw new Error("Use a PNG, JPEG, or WebP image");
	}
	if (file.size > 5 * 1024 * 1024) {
		throw new Error("File is larger than 5 MB");
	}
	const bitmap = await createImageBitmap(file);
	const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
	const width = Math.max(1, Math.round(bitmap.width * scale));
	const height = Math.max(1, Math.round(bitmap.height * scale));

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Your browser cannot process images");

	ctx.fillStyle = "#ffffff"; // latar putih supaya PNG transparan tidak jadi hitam di JPEG
	ctx.fillRect(0, 0, width, height);
	ctx.drawImage(bitmap, 0, 0, width, height);
	bitmap.close();
	return canvas.toDataURL("image/jpeg", 0.85);
}

function checkImageUrl(url: string): Promise<void> {
	return new Promise((resolve, reject) => {
		let parsed: URL;
		try {
			parsed = new URL(url);
		} catch {
			reject(new Error("That is not a valid URL"));
			return;
		}
		if (parsed.protocol !== "https:") {
			reject(new Error("URL must start with https://"));
			return;
		}
		const img = new Image();
		img.referrerPolicy = "no-referrer";
		img.onload = () => {
			if (img.naturalWidth > MAX_IMAGE_SIDE || img.naturalHeight > MAX_IMAGE_SIDE) {
				reject(
					new Error(
						`Image is ${img.naturalWidth}×${img.naturalHeight}px; the maximum is ${MAX_IMAGE_SIDE}×${MAX_IMAGE_SIDE}px`,
					),
				);
				return;
			}
			resolve();
		};
		img.onerror = () => reject(new Error("Could not load an image from that URL"));
		img.src = url;
	});
}

/* ---------- komponen kecil ---------- */

function FieldError({ errors }: { errors: unknown[] }) {
	const messages = errors
		.filter(Boolean)
		.map((e) =>
			typeof e === "string" ? e : ((e as { message?: string }).message ?? "Invalid value"),
		);
	if (messages.length === 0) return null;
	return (
		<p className="text-xs text-destructive" role="alert">
			{messages.join(", ")}
		</p>
	);
}

function ProductImageInput({
	value,
	onChange,
}: {
	value: string | null;
	onChange: (value: string | null) => void;
}) {
	const fileRef = useRef<HTMLInputElement>(null);
	const [url, setUrl] = useState(value && !value.startsWith("data:") ? value : "");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");

	async function handleFile(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		setBusy(true);
		setError("");
		try {
			onChange(await fileToResizedDataUrl(file));
			setUrl("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not read that image");
		} finally {
			setBusy(false);
		}
	}

	async function applyUrl() {
		const next = url.trim();
		if (!next) return;
		setBusy(true);
		setError("");
		try {
			await checkImageUrl(next);
			onChange(next);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not use that URL");
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="space-y-3">
			<Label htmlFor="product-image-url">Image (max {MAX_IMAGE_SIDE}px)</Label>
			<div className="flex items-start gap-4">
				<div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted text-muted-foreground">
					{value ? (
						<img
							src={value}
							alt="Product preview"
							referrerPolicy="no-referrer"
							className="size-full object-cover"
						/>
					) : (
						<ImageIcon className="size-8" aria-hidden="true" />
					)}
				</div>
				<div className="flex flex-wrap gap-2">
					<input
						ref={fileRef}
						type="file"
						accept="image/png,image/jpeg,image/webp"
						className="hidden"
						onChange={handleFile}
						aria-label="Choose image file"
					/>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={busy}
						onClick={() => fileRef.current?.click()}
					>
						<Upload className="size-4" /> Choose file
					</Button>
					{value && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={busy}
							onClick={() => {
								onChange(null);
								setUrl("");
								setError("");
							}}
						>
							<Trash2 className="size-4" /> Remove
						</Button>
					)}
					<p className="w-full text-xs text-muted-foreground">
						Larger images are resized to fit {MAX_IMAGE_SIDE}×{MAX_IMAGE_SIDE}px automatically.
					</p>
				</div>
			</div>
			<div className="flex gap-2">
				<Input
					id="product-image-url"
					type="url"
					value={url}
					onChange={(e) => setUrl(e.target.value)}
					placeholder="…or paste an https:// image URL"
					disabled={busy}
				/>
				<Button type="button" variant="secondary" disabled={busy || !url.trim()} onClick={applyUrl}>
					{busy ? "Checking…" : "Use URL"}
				</Button>
			</div>
			{error && (
				<p className="text-xs text-destructive" role="alert">
					{error}
				</p>
			)}
		</div>
	);
}

/* ---------- modal utama ---------- */

/**
 * Render komponen ini dengan `key` (mis. product?.id ?? "new") supaya form
 * selalu mulai dari defaultValues yang benar setiap kali dibuka.
 */
export function ProductFormModal({
	product,
	onClose,
}: { product: Product | null; onClose: () => void }) {
	const queryClient = useQueryClient();
	const createFn = useServerFn(createProduct);
	const updateFn = useServerFn(updateProduct);
	const [error, setError] = useState("");

	const form = useForm({
		defaultValues: {
			name: product?.name ?? "",
			description: product?.description ?? "",
			price: product ? String(product.price) : "",
			stock: product ? String(product.stock) : "",
			image: product?.image ?? (null as string | null),
		},
		onSubmit: async ({ value }) => {
			setError("");
			const payload = {
				name: value.name.trim(),
				description: value.description.trim(),
				price: Number(value.price),
				stock: Number(value.stock),
				image: value.image,
			};
			try {
				if (product) {
					await updateFn({ data: { id: product.id, ...payload } });
				} else {
					await createFn({ data: payload });
				}
				await queryClient.invalidateQueries({ queryKey: ["products"] });
				onClose();
			} catch (err) {
				setError(err instanceof Error ? err.message : "Something went wrong");
			}
		},
	});

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open && !form.state.isSubmitting) onClose();
			}}
		>
			<DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{product ? "Edit product" : "Add product"}</DialogTitle>
					<DialogDescription>
						{product
							? "Update the details below and save."
							: "Fill in the details of the new product."}
					</DialogDescription>
				</DialogHeader>

				{error && (
					<div
						role="alert"
						className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
					>
						{error}
					</div>
				)}

				<form
					noValidate
					className="space-y-4"
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
				>
					<form.Field
						name="name"
						validators={{
							onChange: ({ value }) =>
								!value.trim()
									? "Name is required"
									: value.length > 100
										? "Max 100 characters"
										: undefined,
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="name">Name</Label>
								<Input
									id="name"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="e.g. Starter Kit"
								/>
								<FieldError errors={field.state.meta.errors} />
							</div>
						)}
					</form.Field>

					<form.Field
						name="description"
						validators={{
							onChange: ({ value }) =>
								!value.trim()
									? "Description is required"
									: value.length > 500
										? "Max 500 characters"
										: undefined,
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="description">Description</Label>
								<textarea
									id="description"
									rows={3}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="e.g. Everything you need to begin."
									className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
								/>
								<FieldError errors={field.state.meta.errors} />
							</div>
						)}
					</form.Field>

					<div className="grid gap-4 sm:grid-cols-2">
						<form.Field
							name="price"
							validators={{
								onChange: ({ value }) =>
									value.trim() === ""
										? "Price is required"
										: Number.isFinite(Number(value)) && Number(value) >= 0
											? undefined
											: "Price must be 0 or more",
							}}
						>
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor="price">Price</Label>
									<Input
										id="price"
										type="number"
										inputMode="decimal"
										step="0.01"
										min="0"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="0.00"
									/>
									<FieldError errors={field.state.meta.errors} />
								</div>
							)}
						</form.Field>

						<form.Field
							name="stock"
							validators={{
								onChange: ({ value }) =>
									value.trim() === ""
										? "Stock is required"
										: Number.isInteger(Number(value)) && Number(value) >= 0
											? undefined
											: "Stock must be a whole number, 0 or more",
							}}
						>
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor="stock">Stock</Label>
									<Input
										id="stock"
										type="number"
										inputMode="numeric"
										step="1"
										min="0"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="0"
									/>
									<FieldError errors={field.state.meta.errors} />
								</div>
							)}
						</form.Field>
					</div>

					<form.Field name="image">
						{(field) => (
							<ProductImageInput value={field.state.value} onChange={field.handleChange} />
						)}
					</form.Field>

					<form.Subscribe selector={(s) => s.isSubmitting}>
						{(isSubmitting) => (
							<DialogFooter className="gap-2 pt-2">
								<Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
									Cancel
								</Button>
								<Button type="submit" disabled={isSubmitting}>
									{isSubmitting ? "Saving…" : product ? "Save changes" : "Create product"}
								</Button>
							</DialogFooter>
						)}
					</form.Subscribe>
				</form>
			</DialogContent>
		</Dialog>
	);
}
