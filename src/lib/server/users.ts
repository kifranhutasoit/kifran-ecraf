import { createServerFn } from "@tanstack/react-start";

import { countAdmins, db, getUserRole, removeWhere, setUserRole } from "@/lib/db";
import { httpError } from "@/lib/errors";
import { userIdSchema, userRoleInputSchema } from "@/lib/schemas";
import { requireAdmin } from "@/lib/session";
import { validator } from "@/lib/validate";

// Administrator-only. Guardrails that protect the app from locking itself out
// are enforced HERE, on the server, because the UI checks can be bypassed:
//   1. You cannot change your own role.
//   2. You cannot delete your own account.
//   3. The last remaining administrator cannot be demoted or deleted.

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
	.validator(validator(userRoleInputSchema))
	.handler(async ({ data }) => {
		const { user: actor } = await requireAdmin();

		const target = db.user.find((u) => u.id === data.userId);
		if (!target) {
			throw httpError(404, "User not found.");
		}
		const currentRole = getUserRole(target.id);
		if (currentRole === data.role) {
			return { ok: true, role: data.role };
		}
		if (target.id === actor.id) {
			throw httpError(400, "You cannot change your own role.");
		}
		if (currentRole === "admin" && countAdmins() <= 1) {
			throw httpError(400, "Cannot demote the last administrator. Promote another user first.");
		}

		setUserRole(target.id, data.role);
		return { ok: true, role: data.role };
	});

export const deleteUser = createServerFn({ method: "POST" })
	.validator(validator(userIdSchema))
	.handler(async ({ data }) => {
		const { user: actor } = await requireAdmin();

		if (data.userId === actor.id) {
			throw httpError(400, "You cannot delete your own account.");
		}
		const target = db.user.find((u) => u.id === data.userId);
		if (!target) {
			throw httpError(404, "User not found.");
		}
		if (getUserRole(target.id) === "admin" && countAdmins() <= 1) {
			throw httpError(400, "Cannot delete the last administrator.");
		}

		// Remove everything tied to the account so it cannot sign back in.
		removeWhere(db.user, (u) => u.id === data.userId);
		removeWhere(db.account, (a) => a.userId === data.userId);
		removeWhere(db.session, (s) => s.userId === data.userId);
		removeWhere(db.userRole, (r) => r.userId === data.userId);
		return { ok: true };
	});
