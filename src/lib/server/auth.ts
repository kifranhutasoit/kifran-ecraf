import { createServerFn } from "@tanstack/react-start";

import { auth } from "@/lib/auth";
import { countAdmins, db, getUserRole } from "@/lib/db";
import { httpError } from "@/lib/errors";
import { getCurrentSession } from "@/lib/session";

/**
 * Server-only session lookup. Used by route `beforeLoad` guards and the
 * sidebar shell. It returns the server-side role so the UI can hide admin-only
 * controls. Hiding is cosmetic; every mutation still checks the role itself.
 */
export const getServerSession = createServerFn({ method: "GET" }).handler(async () => {
	return getCurrentSession();
});

/**
 * One-time setup: creates the administrator account and sample products.
 *
 * - Idempotent: does nothing once an administrator exists.
 * - The password is NEVER in source code or in the UI. It comes from the
 *   SEED_ADMIN_PASSWORD environment variable (see .env.example). If it is not
 *   set, seeding refuses to run.
 * - Creating an admin without knowing the password is useless: the attacker
 *   would not know the password the operator configured.
 */
export const seedAdmin = createServerFn({ method: "POST" }).handler(async () => {
	const alreadySeeded = db.user.some((u) => getUserRole(u.id) === "admin");
	if (alreadySeeded) {
		return { ok: true, alreadySeeded: true };
	}

	const password = process.env.SEED_ADMIN_PASSWORD ?? "";
	if (password.length < 10) {
		throw httpError(
			500,
			"Setup is not configured. Set SEED_ADMIN_PASSWORD (at least 10 characters) in .env.local, then restart the server.",
		);
	}
	const email = (process.env.SEED_ADMIN_EMAIL || "admin@example.com").trim().toLowerCase();

	await auth.api.signUpEmail({
		body: {
			email,
			password,
			name: "Administrator",
		},
		headers: new Headers(),
	});

	const adminUser = db.user.find((u) => u.email === email);
	if (!adminUser) {
		throw httpError(500, "Admin account could not be created.");
	}
	const existing = db.userRole.find((r) => r.userId === adminUser.id);
	if (existing) {
		existing.role = "admin";
	} else {
		db.userRole.push({ userId: adminUser.id, role: "admin" });
	}

	const now = new Date().toISOString();
	const samples = [
		{ name: "Starter Kit", description: "Everything you need to begin.", price: 49, stock: 12 },
		{ name: "Pro Plan", description: "For growing teams.", price: 149, stock: 5 },
		{ name: "Enterprise", description: "Self-hosted, full support.", price: 499, stock: 1 },
	];
	db.product.push(
		...samples.map((p) => ({
			id: crypto.randomUUID(),
			...p,
			imageUrl: null,
			createdAt: now,
			updatedAt: now,
		})),
	);

	return { ok: true, alreadySeeded: false, admin: email, adminCount: countAdmins() };
});
