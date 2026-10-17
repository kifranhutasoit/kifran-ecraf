import { memoryAdapter } from "better-auth/adapters/memory";

export type Role = "admin" | "user";

export interface Product {
	id: string;
	name: string;
	description: string;
	price: number;
	stock: number;
	/** Embedded PNG/JPEG/WebP/GIF data URL (max 512px), or null. */
	imageUrl: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface UserRole {
	userId: string;
	role: Role;
}

/**
 * In-memory development database.
 *
 * better-auth owns the `user`, `session`, `account` and `verification` tables
 * (managed through `memoryAdapter`). This app adds `product` and `userRole`.
 *
 * NOTE: memory only. Data lives for one running server process and resets on
 * redeploy / cold start. Collections are mutated IN PLACE (never reassigned) so
 * the adapter and this module always see the same arrays.
 */
const memoryDb = {
	user: [] as Array<{
		id: string;
		email: string;
		name: string | null;
		image: string | null;
		emailVerified: boolean;
		emailVerifiedAt: Date | null;
		createdAt: Date;
		updatedAt: Date;
		lastSignInAt: Date | null;
	}>,
	session: [] as Array<{ id: string; userId: string; [key: string]: unknown }>,
	account: [] as Array<{ id: string; userId: string; [key: string]: unknown }>,
	verification: [] as unknown[],
	product: [] as Product[],
	userRole: [] as UserRole[],
};

export const adapter = memoryAdapter(memoryDb);
export const db = memoryDb;

export function getUserRole(userId: string): Role {
	return db.userRole.find((r) => r.userId === userId)?.role ?? "user";
}

export function setUserRole(userId: string, role: Role) {
	const existing = db.userRole.find((r) => r.userId === userId);
	if (existing) {
		existing.role = role;
	} else {
		db.userRole.push({ userId, role });
	}
}

export function countAdmins(): number {
	return db.userRole.filter((r) => r.role === "admin").length;
}

/** Remove matching items from an array in place. */
export function removeWhere<T>(list: T[], predicate: (item: T) => boolean): void {
	for (let i = list.length - 1; i >= 0; i--) {
		if (predicate(list[i])) list.splice(i, 1);
	}
}
