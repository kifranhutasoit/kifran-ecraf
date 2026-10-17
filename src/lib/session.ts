import { getRequest } from "@tanstack/react-start/server";

import { auth } from "./auth";
import { type Role, getUserRole } from "./db";
import { httpError } from "./errors";

/**
 * Read the current better-auth session from the incoming request, plus the
 * role stored server-side. The role is never taken from the client.
 *
 * Server-only: relies on `getRequest()`.
 */
export async function getCurrentSession() {
	const request = getRequest();
	const result = await auth.api.getSession({
		headers: request.headers,
	});
	const user = result?.user ?? null;
	return {
		session: result?.session ?? null,
		user,
		role: user ? getUserRole(user.id) : null,
	};
}

export async function requireAuth() {
	const { session, user, role } = await getCurrentSession();
	if (!session || !user || !role) {
		throw httpError(401, "You must be signed in.");
	}
	return { session, user, role: role as Role };
}

export async function requireAdmin() {
	const ctx = await requireAuth();
	if (ctx.role !== "admin") {
		throw httpError(403, "Administrator access required.");
	}
	return ctx;
}
