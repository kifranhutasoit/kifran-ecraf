import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { db, getUserRole, removeUserRole, setUserRole } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

const userIdSchema = z.string().min(1, "Invalid user id").max(128, "Invalid user id");

export const userRoleSchema = z.object({
	userId: userIdSchema,
	role: z.enum(["admin", "user"]),
});

function httpError(message: string, status: number) {
	return Object.assign(new Error(message), { status });
}

function countAdmins() {
	return db.user.filter((u) => getUserRole(u.id) === "admin").length;
}

function purgeByUserId(list: unknown[], userId: string) {
	for (let i = list.length - 1; i >= 0; i--) {
		if ((list[i] as { userId?: string }).userId === userId) list.splice(i, 1);
	}
}

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
		const { user: actor } = await requireAdmin();

		const target = db.user.find((u) => u.id === data.userId);
		if (!target) throw httpError("User not found", 404);

		const current = getUserRole(target.id);
		if (current === data.role) return { ok: true };

		// Admin tidak boleh menurunkan dirinya sendiri (mencegah salah klik / lockout).
		if (actor.id === target.id && data.role !== "admin") {
			throw httpError("You cannot remove your own admin role", 400);
		}
		// Selalu sisakan minimal satu admin.
		if (current === "admin" && data.role !== "admin" && countAdmins() <= 1) {
			throw httpError("Cannot demote the last administrator", 400);
		}

		setUserRole(target.id, data.role);
		return { ok: true };
	});

export const deleteUser = createServerFn({ method: "POST" })
	.validator(z.object({ userId: userIdSchema }))
	.handler(async ({ data }) => {
		const { user: actor } = await requireAdmin();

		if (actor.id === data.userId) {
			throw httpError("You cannot delete your own account", 400);
		}

		const index = db.user.findIndex((u) => u.id === data.userId);
		if (index === -1) throw httpError("User not found", 404);

		if (getUserRole(data.userId) === "admin" && countAdmins() <= 1) {
			throw httpError("Cannot delete the last administrator", 400);
		}

		db.user.splice(index, 1);
		// Cabut semua sesi dan kredensial milik user itu supaya langsung tidak bisa masuk lagi.
		purgeByUserId(db.session, data.userId);
		purgeByUserId(db.account, data.userId);
		removeUserRole(data.userId);
		return { ok: true };
	});
