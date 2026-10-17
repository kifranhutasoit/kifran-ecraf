import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
	createColumnHelper,
	flexRender,
	rowSortingFeature,
	tableFeatures,
	useTable,
} from "@tanstack/react-table";

import type { Product } from "@/lib/db";
import { getServerSession } from "@/lib/server/auth";
import { deleteProduct, getProducts } from "@/lib/server/products";

export const Route = createFileRoute("/products/")({
	beforeLoad: async () => {
		const { session } = await getServerSession();
		if (!session) {
			return redirect({ to: "/demo/better-auth" }) as any;
		}
	},
	component: Products,
});

function Products() {
	const queryClient = useQueryClient();
	const productsQuery = useQuery({
		queryKey: ["products"],
		queryFn: async () => getProducts(),
	});
	const deleteFn = useServerFn(deleteProduct);

	const features = tableFeatures({ rowSortingFeature });
	const columnHelper = createColumnHelper<typeof features, Product>();

	const columns = columnHelper.columns([
		columnHelper.accessor("name", { header: "Name" }),
		columnHelper.accessor("description", { header: "Description" }),
		columnHelper.accessor("price", {
			header: "Price",
			cell: (info) => `$${Number(info.getValue()).toFixed(2)}`,
		}),
		columnHelper.accessor("stock", { header: "Stock" }),
		columnHelper.display({
			id: "actions",
			header: "Actions",
			cell: (info) => {
				const product = info.row.original as Product;
				return (
					<div className="flex items-center gap-2">
						<Link
							to="/products/$productId"
							params={{ productId: product.id }}
							className="text-xs text-[var(--sea-ink)] underline underline-offset-4 hover:text-[var(--sea-ink)]"
						>
							Edit
						</Link>
						<button
							type="button"
							onClick={() => void handleDelete(product.id)}
							className="text-xs text-red-600 hover:text-red-900 underline underline-offset-4"
						>
							Delete
						</button>
					</div>
				);
			},
		}),
	]);

	const table = useTable({
		features,
		columns,
		data: productsQuery.data ?? [],
	});

	const handleDelete = async (id: string) => {
		if (!window.confirm("Delete this product?")) {
			return;
		}
		try {
			await deleteFn({ data: { id } });
			await queryClient.invalidateQueries({ queryKey: ["products"] });
		} catch (err) {
			window.alert(err instanceof Error ? err.message : "Delete failed");
		}
	};

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell rounded-2xl p-6 sm:p-8">
				<div className="flex flex-wrap items-center justify-between gap-4 mb-6">
					<div>
						<p className="island-kicker mb-2">Products</p>
						<h1 className="display-title mb-1 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
							Products
						</h1>
						<p className="m-0 text-[var(--sea-ink-soft)]">
							TanStack Table + TanStack Query + server functions. Admin only.
						</p>
					</div>
					<Link
						to="/products/new"
						className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] px-5 py-3 text-sm font-semibold text-[var(--sea-ink)] no-underline transition hover:bg-[var(--link-bg-hover)]"
					>
						Add Product
					</Link>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-sm border-collapse">
						<thead>
							{table.getHeaderGroups().map((headerGroup) => (
								<tr key={headerGroup.id}>
									{headerGroup.headers.map((header) => {
										return (
											<th
												key={header.id}
												colSpan={header.colSpan}
												className="px-4 py-3 text-left text-xs font-semibold text-[var(--sea-ink-soft)] bg-[var(--chip-bg)]"
											>
												{header.isPlaceholder ? null : (
													<div
														{...{
															className: "flex items-center gap-1 cursor-pointer select-none",
															onClick: header.column.getToggleSortingHandler(),
														}}
													>
														{flexRender(header.column.columnDef.header, header.getContext())}
														{{
															asc: " ▲",
															desc: " ▼",
														}[header.column.getIsSorted() as string] ?? null}
													</div>
												)}
											</th>
										);
									})}
								</tr>
							))}
						</thead>
						<tbody>
							{table.getRowModel().rows.map((row) => {
								return (
									<tr key={row.id} className="border-b border-[var(--line)]">
										{row.getAllCells().map((cell) => {
											return (
												<td key={cell.id} className="px-4 py-3">
													{flexRender(cell.column.columnDef.cell, cell.getContext())}
												</td>
											);
										})}
									</tr>
								);
							})}
							{table.getRowModel().rows.length === 0 && (
								<tr>
									<td
										colSpan={columns.length}
										className="px-4 py-8 text-center text-[var(--sea-ink-soft)]"
									>
										No products yet. Add one to get started.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				{productsQuery.isError && (
					<p className="mt-4 text-sm text-red-600">
						Failed to load products: {(productsQuery.error as Error).message}
					</p>
				)}
			</section>
		</main>
	);
}
