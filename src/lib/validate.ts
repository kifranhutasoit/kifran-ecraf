import type { z } from "zod";

import { httpError } from "./errors";

/**
 * Turns a zod schema into a TanStack Start `.validator(...)` function.
 * On failure it throws a 400 with the FIRST human-readable message, so users
 * see "Name is required." instead of a raw JSON list of zod issues.
 */
export function validator<T extends z.ZodType>(schema: T) {
	return (input: unknown): z.output<T> => {
		const result = schema.safeParse(input);
		if (!result.success) {
			throw httpError(400, result.error.issues[0]?.message ?? "Invalid input.");
		}
		return result.data;
	};
}
