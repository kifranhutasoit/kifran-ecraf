import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { getProducts } from "@/lib/server/products";
import { getUsers } from "@/lib/server/users";

// Proteksi login sudah ditangani layout `_admin` (redirect ke /login).
export const Route = createFileRoute("/_admin/dashboard")({
	component: Dashboard,
});

function StatCard({ title, value }: { title: string; value: number }) {
	return (
		<div className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-5">
			<p className="m-0 text-sm text-[var(--sea-ink-soft)]">{title}</p>
			<p className="m-0 mt-1 text-3xl font-bold text-[var(--sea-ink)]">{value}</p>
		</div>
	);
}

function Card({
	title,
	subtitle,
	children,
}: {
	title: string;
	subtitle: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-5">
			<p className="m-0 text-sm font-semibold text-[var(--sea-ink)]">{title}</p>
			<p className="m-0 mt-1 text-xs text-[var(--sea-ink-soft)]">{subtitle}</p>
			<div className="mt-4">{children}</div>
		</div>
	);
}

function Dashboard() {
	const { role } = Route.useRouteContext();
	const isAdmin = role === "admin";

	const productsQuery = useQuery({
		queryKey: ["dashboard", "products"],
		queryFn: async () => getProducts(),
	});
	// getUsers khusus admin, jadi hanya dijalankan untuk admin.
	const usersQuery = useQuery({
		queryKey: ["dashboard", "users"],
		queryFn: async () => getUsers(),
		enabled: isAdmin,
	});

	const products = productsQuery.data ?? [];
	const users = usersQuery.data ?? [];
	const adminCount = users.filter((u) => u.role === "admin").length;
	const linkClass =
		"font-medium text-[var(--sea-ink)] underline underline-offset-4 hover:opacity-80";

	return (
		<main className="px-4 py-8 sm:px-6">
			<section className="island-shell rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">Dashboard</p>
				<h1 className="display-title mb-1 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
					Overview
				</h1>
				<p className="m-0 mb-6 text-[var(--sea-ink-soft)]">
					Secure admin area. All writes are validated server-side.
				</p>

				<div className="grid gap-4 sm:grid-cols-3">
					<StatCard title="Products" value={productsQuery.isPending ? 0 : products.length} />
					{isAdmin && <StatCard title="Users" value={users.length} />}
					{isAdmin && <StatCard title="Administrators" value={adminCount} />}
				</div>

				<div className="mt-8 grid gap-4 sm:grid-cols-2">
					<Card title="Products" subtitle="View, create, edit, and delete products.">
						<Link to="/products" className={linkClass}>
							Manage products &rarr;
						</Link>
					</Card>
					{isAdmin && (
						<Card title="Users" subtitle="Manage user accounts and roles (admin only).">
							<Link to="/users" className={linkClass}>
								Manage users &rarr;
							</Link>
						</Card>
					)}
				</div>

				{productsQuery.isError && (
					<p className="mt-4 text-sm text-red-600">
						Failed to load products: {(productsQuery.error as Error).message}
					</p>
				)}
				{usersQuery.isError && (
					<p className="mt-4 text-sm text-red-600">
						Failed to load users: {(usersQuery.error as Error).message}
					</p>
				)}
			</section>
		</main>
	);
}