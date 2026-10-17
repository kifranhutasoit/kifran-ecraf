import { z } from "zod";

const imageSchema = z
	.string()
	.max(700_000)
	.refine(
		(v) => /^https:\/\//.test(v) || /^data:image\/(png|jpeg|webp);base64,/.test(v),
		"Image must be an https URL or a png/jpeg/webp data URL",
	)
	.optional();

export const productSchema = z.object({
	name: z.string().trim().min(1).max(100),
	description: z.string().trim().max(500).default(""),
	price: z.coerce.number().min(0).max(1_000_000_000),
	stock: z.coerce.number().int().min(0).max(1_000_000),
	image: imageSchema,
});

export const updateProductSchema = productSchema.extend({ id: z.string().min(1) });
export const productIdSchema = z.object({ id: z.string().min(1) });

export const roleSchema = z.object({
	userId: z.string().min(1),
	role: z.enum(["admin", "user"]),
});
export const userIdSchema = z.object({ userId: z.string().min(1) });
