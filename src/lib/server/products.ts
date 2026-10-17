import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { type Product, db } from "@/lib/db";
import { MAX_IMAGE_FIELD_LENGTH, validateImageValue } from "@/lib/image";
import { requireAdmin, requireAuth } from "@/lib/session";

const requiredText = (label: string, max: number) =>
	z
		.string()
		.trim()
		.min(1, `${label} is required`)
		.max(max, `${label} must be at most ${max} characters`);

const imageSchema = z
	.string()
	.max(MAX_IMAGE_FIELD_LENGTH, "Image is too large")
	.nullable()
	.optional()
	.superRefine((value, ctx) => {
		if (!value) return;
		const message = validateImageValue(value);
		if (message) ctx.addIssue({ code: "custom", message });
	});

export const productSchema = z.object({
	name: requiredText("Name", 100),
	description: requiredText("Description", 500),
	price: z.number().min(0, "Price must be 0 or more").max(1_000_000_000, "Price is too large"),
	stock: z
		.number()
		.int("Stock must be a whole number")
		.min(0, "Stock must be 0 or more")
		.max(1_000_000, "Stock is too large"),
	image: imageSchema,
});

export type ProductInput = z.infer<typeof productSchema>;

const idSchema = z.string().uuid("Invalid product id");

function notFound() {
	const err = new Error("Product not found") as Error & { status?: number };
	err.status = 404;
	return err;
}

// TanStack Start server functions hanya mendukung GET dan POST.
export const getProducts = createServerFn({ method: "GET" }).handler(async () => {
	await requireAuth();
	return [...db.product].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) as Product[];
});

export const createProduct = createServerFn({ method: "POST" })
	.validator(productSchema)
	.handler(async ({ data }) => {
		await requireAdmin();
		const now = new Date().toISOString();
		// Field ditulis satu per satu (bukan ...data) supaya tidak ada mass-assignment.
		const product: Product = {
			id: crypto.randomUUID(),
			name: data.name,
			description: data.description,
			price: data.price,
			stock: data.stock,
			image: data.image ?? null,
			createdAt: now,
			updatedAt: now,
		};
		db.product.push(product);
		return product;
	});

export const updateProduct = createServerFn({ method: "POST" })
	.validator(z.object({ id: idSchema, ...productSchema.shape }))
	.handler(async ({ data }) => {
		await requireAdmin();
		const index = db.product.findIndex((p) => p.id === data.id);
		if (index === -1) throw notFound();

		const updated: Product = {
			...db.product[index],
			name: data.name,
			description: data.description,
			price: data.price,
			stock: data.stock,
			image: data.image ?? null,
			updatedAt: new Date().toISOString(),
		};
		db.product[index] = updated;
		return updated;
	});

export const deleteProduct = createServerFn({ method: "POST" })
	.validator(z.object({ id: idSchema }))
	.handler(async ({ data }) => {
		await requireAdmin();
		const index = db.product.findIndex((p) => p.id === data.id);
		if (index === -1) throw notFound();
		db.product.splice(index, 1);
		return { ok: true };
	});
