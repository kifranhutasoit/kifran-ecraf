import { createServerFn } from "@tanstack/react-start";

import { type Product, db } from "@/lib/db";
import { httpError } from "@/lib/errors";
import { productFieldsSchema, productIdSchema, productUpdateSchema } from "@/lib/schemas";
import { requireAdmin, requireAuth } from "@/lib/session";
import { validator } from "@/lib/validate";

// Every handler re-checks authorization on the server. Validators run first
// and reject malformed input (including oversized or non-image data URLs).
// TanStack Start server functions support GET and POST only, so mutations use
// POST and the action is implied by the function name.

export const getProducts = createServerFn({ method: "GET" }).handler(async () => {
	await requireAuth();
	return [...db.product].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
});

export const createProduct = createServerFn({ method: "POST" })
	.validator(validator(productFieldsSchema))
	.handler(async ({ data }) => {
		await requireAdmin();
		const now = new Date().toISOString();
		const product: Product = {
			id: crypto.randomUUID(),
			name: data.name,
			description: data.description,
			price: data.price,
			stock: data.stock,
			imageUrl: data.imageUrl ?? null,
			createdAt: now,
			updatedAt: now,
		};
		db.product.push(product);
		return product;
	});

export const updateProduct = createServerFn({ method: "POST" })
	.validator(validator(productUpdateSchema))
	.handler(async ({ data }) => {
		await requireAdmin();
		const index = db.product.findIndex((p) => p.id === data.id);
		if (index === -1) {
			throw httpError(404, "Product not found.");
		}
		const current = db.product[index];
		// `imageUrl` omitted = keep the existing image; null = remove it.
		const updated: Product = {
			...current,
			name: data.name,
			description: data.description,
			price: data.price,
			stock: data.stock,
			imageUrl: data.imageUrl === undefined ? current.imageUrl : data.imageUrl,
			updatedAt: new Date().toISOString(),
		};
		db.product[index] = updated;
		return updated;
	});

export const deleteProduct = createServerFn({ method: "POST" })
	.validator(validator(productIdSchema))
	.handler(async ({ data }) => {
		await requireAdmin();
		const index = db.product.findIndex((p) => p.id === data.id);
		if (index === -1) {
			throw httpError(404, "Product not found.");
		}
		db.product.splice(index, 1);
		return { ok: true };
	});
