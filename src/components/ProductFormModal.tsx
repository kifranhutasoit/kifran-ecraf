import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";

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
import { Textarea } from "@/components/ui/textarea";
import type { Product } from "@/lib/db";
import { PRODUCTS_QUERY_KEY } from "@/lib/query-keys";
import { productFieldsSchema } from "@/lib/schemas";
import { createProduct, updateProduct } from "@/lib/server/products";

import { ProductImageField } from "./ProductImageField";
import { Notice } from "./states";

type FormValues = {
	name: string;
	description: string;
	price: string;
	stock: string;
	imageUrl: string | null;
};

type FieldErrors = Partial<Record<keyof FormValues, string>>;

// Empty text must become NaN, not 0, so an empty price is rejected.
function toNumber(raw: string) {
	return raw.trim() === "" ? Number.NaN : Number(raw);
}

function toPayload(values: FormValues) {
	return {
		name: values.name.trim(),
		description: values.description.trim(),
		price: toNumber(values.price),
		stock: toNumber(values.stock),
		imageUrl: values.imageUrl,
	};
}

function collectErrors(
	issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
): { fields: FieldErrors } | undefined {
	if (issues.length === 0) return undefined;
	const fields: FieldErrors = {};
	for (const issue of issues) {
		const key = issue.path[0];
		if (typeof key === "string" && fields[key as keyof FormValues] === undefined) {
			fields[key as keyof FormValues] = issue.message;
		}
	}
	return { fields };
}

// Cheap text-only check on every change. The image is decoded only on submit.
const textSchema = productFieldsSchema.omit({ imageUrl: true });

function validateText(values: FormValues) {
	const result = textSchema.safeParse(toPayload(values));
	return result.success ? undefined : collectErrors(result.error.issues);
}

function validateAll(values: FormValues) {
	const result = productFieldsSchema.safeParse(toPayload(values));
	return result.success ? undefined : collectErrors(result.error.issues);
}

function visibleError(
	field: { state: { meta: { errors: unknown[]; isTouched: boolean } } },
	submitAttempted: boolean,
) {
	const errors = field.state.meta.errors;
	if (errors.length === 0) return undefined;
	if (!field.state.meta.isTouched && !submitAttempted) return undefined;
	return String(errors[0]);
}

export function ProductFormModal({
	open,
	onOpenChange,
	product,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** null = create a new product. */
	product: Product | null;
}) {
	const [busy, setBusy] = useState(false);

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!busy) onOpenChange(next);
			}}
		>
			<DialogContent className="max-w-xl">
				<DialogHeader>
					<DialogTitle>{product ? "Edit product" : "Add product"}</DialogTitle>
					<DialogDescription>
						{product
							? "Update the details and save your changes."
							: "Create a product for the catalogue. Stock is a whole number."}
					</DialogDescription>
				</DialogHeader>
				{open && (
					<ProductForm
						key={product?.id ?? "new"}
						product={product}
						onDone={() => onOpenChange(false)}
						onBusyChange={setBusy}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

function ProductForm({
	product,
	onDone,
	onBusyChange,
}: {
	product: Product | null;
	onDone: () => void;
	onBusyChange: (busy: boolean) => void;
}) {
	const queryClient = useQueryClient();
	const createFn = useServerFn(createProduct);
	const updateFn = useServerFn(updateProduct);
	const [serverError, setServerError] = useState<string | null>(null);
	const [submitAttempted, setSubmitAttempted] = useState(false);

	const form = useForm({
		defaultValues: {
			name: product?.name ?? "",
			description: product?.description ?? "",
			price: product ? String(product.price) : "",
			stock: product ? String(product.stock) : "",
			imageUrl: product?.imageUrl ?? null,
		} as FormValues,
		validators: {
			onChange: ({ value }) => validateText(value),
			onSubmit: ({ value }) => validateAll(value),
		},
		onSubmit: async ({ value }) => {
			setServerError(null);
			onBusyChange(true);
			try {
				const payload = toPayload(value);
				if (product) {
					await updateFn({ data: { id: product.id, ...payload } });
				} else {
					await createFn({ data: payload });
				}
				await queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
				onDone();
			} catch (err) {
				setServerError(err instanceof Error ? err.message : "Could not save the product.");
			} finally {
				onBusyChange(false);
			}
		},
	});

	return (
		<form
			noValidate
			className="grid gap-5"
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				setSubmitAttempted(true);
				void form.handleSubmit();
			}}
		>
			{serverError && <Notice tone="error">{serverError}</Notice>}

			<form.Field name="name">
				{(field) => {
					const error = visibleError(field, submitAttempted);
					return (
						<div className="grid gap-2">
							<Label htmlFor="product-name">Name</Label>
							<Input
								id="product-name"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="e.g. Starter Kit"
								aria-invalid={!!error}
								aria-describedby={error ? "product-name-error" : undefined}
								autoComplete="off"
								autoFocus
							/>
							{error && (
								<p id="product-name-error" className="m-0 text-xs text-red-600 dark:text-red-400">
									{error}
								</p>
							)}
						</div>
					);
				}}
			</form.Field>

			<form.Field name="description">
				{(field) => {
					const error = visibleError(field, submitAttempted);
					return (
						<div className="grid gap-2">
							<Label htmlFor="product-description">Description</Label>
							<Textarea
								id="product-description"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="A short summary customers will see"
								rows={3}
								aria-invalid={!!error}
								aria-describedby={error ? "product-description-error" : undefined}
							/>
							{error && (
								<p
									id="product-description-error"
									className="m-0 text-xs text-red-600 dark:text-red-400"
								>
									{error}
								</p>
							)}
						</div>
					);
				}}
			</form.Field>

			<div className="grid gap-4 sm:grid-cols-2">
				<form.Field name="price">
					{(field) => {
						const error = visibleError(field, submitAttempted);
						return (
							<div className="grid gap-2">
								<Label htmlFor="product-price">Price (USD)</Label>
								<Input
									id="product-price"
									type="number"
									inputMode="decimal"
									min={0}
									step="0.01"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="0.00"
									aria-invalid={!!error}
									aria-describedby={error ? "product-price-error" : undefined}
								/>
								{error && (
									<p
										id="product-price-error"
										className="m-0 text-xs text-red-600 dark:text-red-400"
									>
										{error}
									</p>
								)}
							</div>
						);
					}}
				</form.Field>

				<form.Field name="stock">
					{(field) => {
						const error = visibleError(field, submitAttempted);
						return (
							<div className="grid gap-2">
								<Label htmlFor="product-stock">Stock</Label>
								<Input
									id="product-stock"
									type="number"
									inputMode="numeric"
									min={0}
									step={1}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="0"
									aria-invalid={!!error}
									aria-describedby={error ? "product-stock-error" : undefined}
								/>
								{error && (
									<p
										id="product-stock-error"
										className="m-0 text-xs text-red-600 dark:text-red-400"
									>
										{error}
									</p>
								)}
							</div>
						);
					}}
				</form.Field>
			</div>

			<form.Field name="imageUrl">
				{(field) => (
					<ProductImageField
						value={field.state.value}
						onChange={(next) => field.handleChange(next)}
						error={visibleError(field, submitAttempted)}
					/>
				)}
			</form.Field>

			<form.Subscribe
				selector={(state) => ({ isSubmitting: state.isSubmitting, isDirty: state.isDirty })}
			>
				{({ isSubmitting, isDirty }) => (
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							disabled={isSubmitting}
							onClick={() => {
								if (isDirty && !window.confirm("Discard your unsaved changes?")) return;
								onDone();
							}}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
							{isSubmitting ? "Saving…" : product ? "Save changes" : "Create product"}
						</Button>
					</DialogFooter>
				)}
			</form.Subscribe>
		</form>
	);
}
