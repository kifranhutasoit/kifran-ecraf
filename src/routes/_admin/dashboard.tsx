import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Package, Plus, Users } from "lucide-react";

import { ProductThumb } from "@/components/product-bits";
import { EmptyState, ErrorState, PageHeader, Panel, SkeletonRows } from "@/components/states";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { PRODUCTS_QUERY_KEY, USERS_QUERY_KEY } from "@/lib/query-keys";
import { getProducts } from "@/lib/server/products";
import { getUsers } from "@/lib/server/users";

export const Route = createFileRoute("/_admin/dashboard")({
	component: Dashboard,
});

function Dashboard() {
	const { currentUser, role } = Route.useRouteContext();
	const isAdmin = role === "admin";

	const productsQuery = useQuery({
		queryKey: PRODUCTS_QUERY_KEY,
		queryFn: () => getProducts(),
	});
	// Only administrators may list users, so skip the request for everyone else.
	const usersQuery = useQuery({
		queryKey: USERS_QUERY_KEY,
		queryFn: () => getUsers(),
		enabled: isAdmin,
	});

	const products = productsQuery.data ?? [];
	const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
	const users = usersQuery.data ?? [];
	const adminCount = users.filter((u) => u.role === "admin").length;
	const firstName = (currentUser.name || "").trim().split(/\s+/)[0];

	return (
		<>
			<PageHeader
				kicker="Overview"
				title={firstName ? `Welcome back, ${firstName}` : "Dashboard"}
				description={
					isAdmin
						? "Your catalogue and team at a glance."
						: "Browse the catalogue. Ask an administrator for editing access."
				}
				actions={
					isAdmin && (
						<Button asChild>
							<Link to="/products" search={{ new: true }}>
								<Plus aria-hidden="true" />
								Add product
							</Link>
						</Button>
					)
				}
			/>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				<Stat label="Products" value={productsQuery.data ? products.length : null} />
				<Stat label="Units in stock" value={productsQuery.data ? totalStock : null} />
				{isAdmin ? (
					<Stat
						label="Administrators"
						value={usersQuery.data ? adminCount : null}
						hint={
							usersQuery.data
								? `${users.length} ${users.length === 1 ? "account" : "accounts"} in total`
								: undefined
						}
						error={usersQuery.isError}
					/>
				) : (
					<Stat label="Your role" valueText="User" hint="Read-only access" />
				)}
			</div>

			<div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
				<Panel>
					<div className="mb-4 flex items-center justify-between gap-3">
						<h2 className="m-0 text-lg font-bold text-[var(--sea-ink)]">Recent products</h2>
						<Link
							to="/products"
							className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--sea-ink)] underline underline-offset-4"
						>
							View all
							<ArrowRight className="size-3.5" aria-hidden="true" />
						</Link>
					</div>

					{productsQuery.isPending ? (
						<SkeletonRows rows={4} />
					) : productsQuery.isError ? (
						<ErrorState
							message={`Could not load products. ${(productsQuery.error as Error).message}`}
							onRetry={() => void productsQuery.refetch()}
						/>
					) : products.length === 0 ? (
						<EmptyState
							title="No products yet"
							description={isAdmin ? "Add your first product to get started." : undefined}
						/>
					) : (
						<ul className="divide-y divide-[var(--line)]">
							{products.slice(0, 5).map((p) => (
								<li key={p.id} className="flex items-center gap-3 py-3">
									<ProductThumb src={p.imageUrl} size="size-10" />
									<div className="min-w-0 flex-1">
										<p className="m-0 truncate text-sm font-semibold text-[var(--sea-ink)]">
											{p.name}
										</p>
										<p className="m-0 text-xs text-[var(--sea-ink-soft)]">Stock {p.stock}</p>
									</div>
									<p className="m-0 shrink-0 text-sm font-semibold text-[var(--sea-ink)]">
										{formatPrice(p.price)}
									</p>
								</li>
							))}
						</ul>
					)}
				</Panel>

				<Panel>
					<h2 className="m-0 mb-4 text-lg font-bold text-[var(--sea-ink)]">Shortcuts</h2>
					<div className="grid gap-3">
						<ShortcutLink
							to="/products"
							icon={Package}
							title="Products"
							body="Browse, sort and manage the catalogue."
						/>
						{isAdmin && (
							<ShortcutLink
								to="/users"
								icon={Users}
								title="Users"
								body="Change roles and remove accounts."
							/>
						)}
					</div>
				</Panel>
			</div>

			{usersQuery.isError && isAdmin && (
				<div className="mt-4">
					<ErrorState message={`Could not load users. ${(usersQuery.error as Error).message}`} />
				</div>
			)}
		</>
	);
}

function Stat({
	label,
	value,
	valueText,
	hint,
	error,
}: {
	label: string;
	value?: number | null;
	valueText?: string;
	hint?: string;
	error?: boolean;
}) {
	const loading = valueText === undefined && (value === null || value === undefined) && !error;
	return (
		<div className="island-shell rounded-2xl p-5">
			<p className="m-0 text-sm font-medium text-[var(--sea-ink-soft)]">{label}</p>
			{loading ? (
				<span
					role="status"
					aria-label="Loading"
					className="mt-3 block h-8 w-20 animate-pulse rounded-md bg-[var(--chip-bg)]"
				/>
			) : (
				<p className="m-0 mt-2 text-3xl font-bold text-[var(--sea-ink)]">
					{error ? "!" : (valueText ?? value?.toLocaleString())}
				</p>
			)}
			{hint && <p className="m-0 mt-1 text-xs text-[var(--sea-ink-soft)]">{hint}</p>}
		</div>
	);
}

function ShortcutLink({
	to,
	icon: Icon,
	title,
	body,
}: {
	to: "/products" | "/users";
	icon: typeof Package;
	title: string;
	body: string;
}) {
	return (
		<Link
			to={to}
			className="group flex items-center gap-4 rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-4 no-underline transition hover:-translate-y-0.5 hover:border-[var(--chip-line)] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
		>
			<span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--palm)] text-white">
				<Icon className="size-5" aria-hidden="true" />
			</span>
			<span className="min-w-0 flex-1">
				<span className="block text-sm font-bold text-[var(--sea-ink)]">{title}</span>
				<span className="block text-xs text-[var(--sea-ink-soft)]">{body}</span>
			</span>
			<ArrowRight
				className="size-4 text-[var(--sea-ink-soft)] transition group-hover:translate-x-0.5"
				aria-hidden="true"
			/>
		</Link>
	);
}
