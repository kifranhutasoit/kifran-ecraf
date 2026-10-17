import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { db, getUserRole, removeUserRole, setUserRole } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const userRoleSchema = z.object({
	userId: z.string(),
	role: z.enum(["admin", "user"]),
});

export const getUsers = createServerFn({ method: "GET" }).handler(async () => {
	await requireAdmin();
	return db.user.map((u) => ({
		id: u.id,
		email: u.email,
		name: u.name,
		role: getUserRole(u.id),
		emailVerified: !!u.emailVerified,
		createdAt: u.createdAt.toISOString(),
	}));
});

export const updateUserRole = createServerFn({ method: "POST" })
	.validator(userRoleSchema)
	.handler(async ({ data }) => {
		await requireAdmin();
		setUserRole(data.userId, data.role);
		return { ok: true };
	});

export const deleteUser = createServerFn({ method: "POST" })
	.validator(z.object({ userId: z.string() }))
	.handler(async ({ data }) => {
		await requireAdmin();
		// Prevent removing the last administrator so the app never locks itself out.
		const role = getUserRole(data.userId);
		if (role === "admin") {
			const adminCount = db.userRole.filter((r) => r.role === "admin").length;
			if (adminCount <= 1) {
				const err = new Error("Cannot delete the last administrator") as Error & {
					status?: number;
				};
				err.status = 400;
				throw err;
			}
		}
		db.user = db.user.filter((u) => u.id !== data.userId);
		removeUserRole(data.userId);
		return { ok: true };
	});
