import { createServerFn } from "@tanstack/react-start";

import { auth } from "@/lib/auth";
import {
	type Product,
	SEED_ADMIN_EMAIL,
	SEED_ADMIN_PASSWORD,
	db,
	getUserRole,
	setUserRole,
} from "@/lib/db";
import { getCurrentSession } from "@/lib/session";

/**
 * Server-only session lookup. Aman dipanggil dari `beforeLoad` karena server
 * function selalu berjalan di server. Mengembalikan role dari store server,
 * jadi client tidak bisa memalsukannya.
 */
export const getServerSession = createServerFn({ method: "GET" }).handler(async () => {
	const { session, user } = await getCurrentSession();
	return {
		session,
		user,
		role: user ? getUserRole(user.id) : null,
	};
});

type SeedResult = { ok: true; alreadySeeded: boolean; admin: string };

const SAMPLE_PRODUCTS = [
	{ name: "Starter Kit", description: "Everything you need to begin.", price: 49, stock: 12 },
	{ name: "Pro Plan", description: "For growing teams.", price: 149, stock: 5 },
	{ name: "Enterprise", description: "Self-hosted, full support.", price: 499, stock: 1 },
];

async function runSeed(): Promise<SeedResult> {
	const hasAdmin = db.user.some((u) =>
		db.userRole.some((r) => r.userId === u.id && r.role === "admin"),
	);
	if (hasAdmin) {
		return { ok: true, alreadySeeded: true, admin: SEED_ADMIN_EMAIL };
	}

	// Sign-up publik terbuka. Kalau email seed sudah didaftarkan orang lain sebelum
	// /setup dijalankan, JANGAN dipromosikan jadi admin (privilege escalation).
	if (db.user.some((u) => u.email === SEED_ADMIN_EMAIL)) {
		throw new Error(
			`${SEED_ADMIN_EMAIL} is already registered without admin rights. Restart the dev server to reset the in-memory data, then run /setup again.`,
		);
	}

	await auth.api.signUpEmail({
		body: { email: SEED_ADMIN_EMAIL, password: SEED_ADMIN_PASSWORD, name: "Administrator" },
		headers: new Headers(),
	});

	const adminUser = db.user.find((u) => u.email === SEED_ADMIN_EMAIL);
	if (!adminUser) {
		throw new Error("Failed to create the admin account");
	}
	setUserRole(adminUser.id, "admin");

	if (db.product.length === 0) {
		const now = new Date().toISOString();
		const products: Product[] = SAMPLE_PRODUCTS.map((p) => ({
			id: crypto.randomUUID(),
			...p,
			image: null,
			createdAt: now,
			updatedAt: now,
		}));
		db.product.push(...products);
	}

	return { ok: true, alreadySeeded: false, admin: SEED_ADMIN_EMAIL };
}

// Satu proses seed bersama: klik ganda / dua request bersamaan tidak membuat race.
let seeding: Promise<SeedResult> | null = null;

/**
 * Seed development satu kali (idempotent): akun admin + produk contoh.
 * Dipanggil dari halaman /setup lewat `useServerFn(seedAdmin)`.
 */
export const seedAdmin = createServerFn({ method: "POST" }).handler(async () => {
	seeding ??= runSeed().finally(() => {
		seeding = null;
	});
	return seeding;
});
