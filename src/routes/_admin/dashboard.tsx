import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
	ArrowRight,
	Boxes,
	List,
	type LucideIcon,
	Package,
	Plus,
	ShieldCheck,
	TriangleAlert,
	Users,
	Zap,
} from "lucide-react";
import type * as React from "react";

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
				<Stat icon={Package} label="Products" value={productsQuery.data ? products.length : null} />
				<Stat icon={Boxes} label="Units in stock" value={productsQuery.data ? totalStock : null} />
				{isAdmin ? (
					<Stat
						icon={ShieldCheck}
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
					<Stat icon={Users} label="Your role" valueText="User" hint="Read-only access" />
				)}
			</div>

			<div className="mt-12 grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-6">
				<section>
					<div className="flex items-center justify-between gap-3 pb-3">
						<SectionTitle icon={List}>Recent products</SectionTitle>
						<Link
							to="/products"
							className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--sea-ink)] underline underline-offset-4"
						>
							View all
							<ArrowRight className="size-3.5" aria-hidden="true" />
						</Link>
					</div>

					{productsQuery.isPending ? (
						<Panel>
							<SkeletonRows rows={4} />
						</Panel>
					) : productsQuery.isError ? (
						<Panel>
							<ErrorState
								message={`Could not load products. ${(productsQuery.error as Error).message}`}
								onRetry={() => void productsQuery.refetch()}
							/>
						</Panel>
					) : products.length === 0 ? (
						<Panel>
							<EmptyState
								title="No products yet"
								description={isAdmin ? "Add your first product to get started." : undefined}
							/>
						</Panel>
					) : (
						<div className="overflow-x-auto rounded-lg bg-[var(--surface-strong)] shadow-sm">
							<table className="w-full border-collapse text-sm">
								<thead className="bg-[var(--table-head)] text-[var(--table-head-fg)]">
									<tr>
										<th scope="col" className="px-4 py-3 text-left text-sm font-semibold uppercase">
											Product
										</th>
										<th scope="col" className="px-4 py-3 text-left text-sm font-semibold uppercase">
											Stock
										</th>
										<th
											scope="col"
											className="px-4 py-3 text-right text-sm font-semibold uppercase"
										>
											Price
										</th>
									</tr>
								</thead>
								<tbody>
									{products.slice(0, 5).map((p) => (
										<tr key={p.id} className="even:bg-[var(--stripe)]">
											<td className="px-4 py-3">
												<div className="flex min-w-0 items-center gap-3">
													<ProductThumb src={p.imageUrl} size="size-10" />
													<span className="truncate font-semibold text-[var(--sea-ink)]">
														{p.name}
													</span>
												</div>
											</td>
											<td className="px-4 py-3 text-[var(--sea-ink-soft)]">{p.stock}</td>
											<td className="px-4 py-3 text-right font-semibold text-[var(--sea-ink)]">
												{formatPrice(p.price)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</section>

				<section>
					<div className="pb-3">
						<SectionTitle icon={Zap}>Shortcuts</SectionTitle>
					</div>
					<Panel>
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

					{products.length > 0 && <StockLevels products={products} />}
				</section>
			</div>

			{usersQuery.isError && isAdmin && (
				<div className="mt-4">
					<ErrorState message={`Could not load users. ${(usersQuery.error as Error).message}`} />
				</div>
			)}
		</>
	);
}

const LOW_STOCK = 5;

/** Plain-CSS bar list: products with the most stock first, low stock flagged. */
function StockLevels({ products }: { products: { id: string; name: string; stock: number }[] }) {
	const top = [...products].sort((a, b) => b.stock - a.stock).slice(0, 5);
	const max = Math.max(1, ...top.map((p) => p.stock));
	const low = products.filter((p) => p.stock <= LOW_STOCK).length;
	return (
		<div className="mt-6">
			<div className="pb-3">
				<SectionTitle icon={Boxes}>Stock levels</SectionTitle>
			</div>
			<Panel>
				<ul className="m-0 grid list-none gap-4 p-0">
					{top.map((p) => (
						<li key={p.id}>
							<div className="mb-1 flex items-center justify-between gap-3 text-sm">
								<span className="truncate font-semibold text-[var(--sea-ink)]">{p.name}</span>
								<span className="shrink-0 text-[var(--sea-ink-soft)]">
									{p.stock.toLocaleString()}
								</span>
							</div>
							<div className="h-2.5 overflow-hidden rounded-full bg-[var(--chip-bg)]">
								<div
									className={
										p.stock <= LOW_STOCK
											? "h-full rounded-full bg-amber-500"
											: "h-full rounded-full bg-[var(--palm)]"
									}
									style={{ width: `${Math.max(3, (p.stock / max) * 100)}%` }}
								/>
							</div>
						</li>
					))}
				</ul>
				{low > 0 && (
					<p className="m-0 mt-4 flex items-center gap-2 text-sm text-[var(--sea-ink-soft)]">
						<TriangleAlert className="size-4 text-amber-500" aria-hidden="true" />
						{low} {low === 1 ? "product has" : "products have"} {LOW_STOCK} or fewer units left.
					</p>
				)}
			</Panel>
		</div>
	);
}

function SectionTitle({
	icon: Icon,
	children,
}: {
	icon: LucideIcon;
	children: React.ReactNode;
}) {
	return (
		<h2 className="m-0 flex items-center text-xl font-normal text-[var(--sea-ink)]">
			<Icon className="mr-3 size-5" aria-hidden="true" />
			{children}
		</h2>
	);
}

function Stat({
	icon: Icon,
	label,
	value,
	valueText,
	hint,
	error,
}: {
	icon: LucideIcon;
	label: string;
	value?: number | null;
	valueText?: string;
	hint?: string;
	error?: boolean;
}) {
	const loading = valueText === undefined && (value === null || value === undefined) && !error;
	return (
		<div className="island-shell flex items-center gap-4 rounded-lg p-5">
			<span className="flex size-12 shrink-0 items-center justify-center rounded-tr-lg rounded-br-lg rounded-bl-lg bg-[var(--palm)] text-white shadow-md">
				<Icon className="size-6" aria-hidden="true" />
			</span>
			<div className="min-w-0">
				<p className="m-0 text-sm font-medium text-[var(--sea-ink-soft)]">{label}</p>
				{loading ? (
					<span
						role="status"
						aria-label="Loading"
						className="mt-2 block h-8 w-20 animate-pulse rounded-md bg-[var(--chip-bg)]"
					/>
				) : (
					<p className="m-0 mt-1 text-3xl font-bold text-[var(--sea-ink)]">
						{error ? "!" : (valueText ?? value?.toLocaleString())}
					</p>
				)}
				{hint && <p className="m-0 mt-1 text-xs text-[var(--sea-ink-soft)]">{hint}</p>}
			</div>
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
			className="group flex items-center gap-4 rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-4 no-underline transition hover:border-[var(--palm)] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
