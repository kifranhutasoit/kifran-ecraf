/**
 * Shared, framework-free validation schemas.
 *
 * These are imported by BOTH the server functions (authoritative validation)
 * and the client forms (fast feedback). The client is untrusted: every
 * mutation re-validates here on the server.
 */
import { z } from "zod";

import { MAX_PRODUCT_IMAGE_DATA_URL_LENGTH, validateProductImage } from "./image";

export const roleSchema = z.enum(["admin", "user"]);

const productImageSchema = z
	.string()
	.max(MAX_PRODUCT_IMAGE_DATA_URL_LENGTH, "Image is too large.")
	.superRefine((value, ctx) => {
		const message = validateProductImage(value);
		if (message) {
			ctx.addIssue({ code: "custom", message });
		}
	});

export const productFieldsSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Name is required.")
		.max(120, "Name must be 120 characters or fewer."),
	description: z
		.string()
		.trim()
		.min(1, "Description is required.")
		.max(1000, "Description must be 1000 characters or fewer."),
	price: z
		.number({ error: "Price must be a number." })
		.min(0, "Price cannot be negative.")
		.max(1_000_000, "Price must be 1,000,000 or less."),
	stock: z
		.number({ error: "Stock must be a whole number." })
		.int("Stock must be a whole number.")
		.min(0, "Stock cannot be negative.")
		.max(1_000_000, "Stock must be 1,000,000 or less."),
	/** A `data:image/...;base64,...` URL, or null/undefined for "no image". */
	imageUrl: productImageSchema.nullish(),
});

export type ProductFields = z.infer<typeof productFieldsSchema>;

export const productIdSchema = z.object({
	id: z.uuid({ error: "Invalid product id." }),
});

export const productUpdateSchema = z.object({
	id: z.uuid({ error: "Invalid product id." }),
	...productFieldsSchema.shape,
});

export const userIdSchema = z.object({
	userId: z.string().min(1, "Missing user id.").max(128),
});

export const userRoleInputSchema = z.object({
	userId: z.string().min(1, "Missing user id.").max(128),
	role: roleSchema,
});
