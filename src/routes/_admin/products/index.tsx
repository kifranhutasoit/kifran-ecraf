import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
	createColumnHelper,
	createSortedRowModel,
	flexRender,
	rowSortingFeature,
	tableFeatures,
	useTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProductFormModal } from "@/components/ProductFormModal";
import { ProductThumb, StockBadge } from "@/components/product-bits";
import { EmptyState, ErrorState, Notice, PageHeader, SkeletonRows } from "@/components/states";
import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { PRODUCTS_QUERY_KEY } from "@/lib/query-keys";
import { deleteProduct, getProducts } from "@/lib/server/products";

// The create/edit modals are driven by the URL (?new=1 or ?edit=<id>), so a
// refresh or a shared link reopens the same dialog.
type ProductsSearch = { new?: true; edit?: string };

export const Route = createFileRoute("/_admin/products/")({
	validateSearch: (search: Record<string, unknown>): ProductsSearch => {
		const out: ProductsSearch = {};
		if (search.new === true || search.new === "1" || search.new === "true") out.new = true;
		if (typeof search.edit === "string" && search.edit.length > 0) out.edit = search.edit;
		return out;
	},
	component: ProductsPage,
});

type FlashMessage = { tone: "success" | "error"; text: string };

// The sorted row model must be registered, otherwise the sort state changes
// (arrows update) but the rows are never reordered.
const features = tableFeatures({
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
});
const columnHelper = createColumnHelper<typeof features, Product>();

function ProductsPage() {
	const { role } = Route.useRouteContext();
	const { new: creating, edit: editingId } = Route.useSearch();
	const isAdmin = role === "admin";
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const productsQuery = useQuery({
		queryKey: PRODUCTS_QUERY_KEY,
		queryFn: () => getProducts(),
	});
	const products = productsQuery.data ?? [];
	const deleteFn = useServerFn(deleteProduct);

	const [notice, setNotice] = useState<FlashMessage | null>(null);
	const [pendingDelete, setPendingDelete] = useState<Product | null>(null);

	const editing = editingId ? (products.find((p) => p.id === editingId) ?? null) : null;
	const modalOpen = isAdmin && (!!creating || !!editing);

	const openCreate = () => navigate({ to: "/products", search: { new: true } });
	const openEdit = (product: Product) =>
		navigate({ to: "/products", search: { edit: product.id } });
	const closeModal = () => navigate({ to: "/products", search: {}, replace: true });

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteFn({ data: { id } }),
		onSuccess: async () => {
			setPendingDelete(null);
			setNotice({ tone: "success", text: "Product deleted." });
			await queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
		},
		onError: (err) => {
			setPendingDelete(null);
			setNotice({ tone: "error", text: err instanceof Error ? err.message : "Delete failed." });
		},
	});

	const columns = columnHelper.columns([
		columnHelper.accessor("name", {
			header: "Product",
			cell: (info) => (
				<div className="flex min-w-0 items-center gap-3">
					<ProductThumb src={info.row.original.imageUrl} />
					<span className="truncate font-semibold text-[var(--sea-ink)]">{info.getValue()}</span>
				</div>
			),
		}),
		columnHelper.accessor("description", {
			header: "Description",
			cell: (info) => (
				<span className="line-clamp-2 text-[var(--sea-ink-soft)]">{info.getValue()}</span>
			),
		}),
		columnHelper.accessor("price", {
			header: "Price",
			cell: (info) => formatPrice(info.getValue()),
		}),
		columnHelper.accessor("stock", {
			header: "Stock",
			cell: (info) => <StockBadge value={info.getValue()} />,
		}),
		columnHelper.display({
			id: "actions",
			header: "",
			cell: (info) =>
				isAdmin ? (
					<div className="flex justify-end gap-2">
						<Button variant="outline" size="sm" onClick={() => openEdit(info.row.original)}>
							<Pencil className="size-3.5" aria-hidden="true" />
							Edit
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="text-red-600 hover:text-red-700 dark:text-red-400"
							onClick={() => setPendingDelete(info.row.original)}
						>
							<Trash2 className="size-3.5" aria-hidden="true" />
							Delete
						</Button>
					</div>
				) : null,
		}),
	]);

	const table = useTable({
		features,
		columns,
		data: products,
	});

	return (
		<>
			<PageHeader
				kicker="Catalogue"
				title="Products"
				description={
					isAdmin
						? `${products.length} ${products.length === 1 ? "product" : "products"}. Click a column to sort.`
						: "Read-only view. Ask an administrator to make changes."
				}
				actions={
					isAdmin && (
						<Button onClick={openCreate}>
							<Plus aria-hidden="true" />
							Add product
						</Button>
					)
				}
			/>

			{notice && (
				<div className="mb-4">
					<Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
						{notice.text}
					</Notice>
				</div>
			)}

			{productsQuery.isPending ? (
				<SkeletonRows rows={5} />
			) : productsQuery.isError ? (
				<ErrorState
					message={`Could not load products. ${(productsQuery.error as Error).message}`}
					onRetry={() => void productsQuery.refetch()}
				/>
			) : products.length === 0 ? (
				<EmptyState
					title="No products yet"
					description={
						isAdmin
							? "Create the first product to start the catalogue."
							: "Nothing has been added yet."
					}
					action={
						isAdmin && (
							<Button onClick={openCreate}>
								<Plus aria-hidden="true" />
								Add product
							</Button>
						)
					}
				/>
			) : (
				<>
					{/* Desktop: sortable table */}
					<div className="hidden overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] md:block">
						<table className="w-full border-collapse text-sm">
							<thead className="bg-[var(--chip-bg)]">
								{table.getHeaderGroups().map((headerGroup) => (
									<tr key={headerGroup.id}>
										{headerGroup.headers.map((header) => {
											const sorted = header.column.getIsSorted();
											return (
												<th
													key={header.id}
													scope="col"
													aria-sort={
														sorted === "asc"
															? "ascending"
															: sorted === "desc"
																? "descending"
																: undefined
													}
													className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--sea-ink-soft)] uppercase"
												>
													{header.isPlaceholder ? null : header.column.getCanSort() ? (
														<button
															type="button"
															onClick={header.column.getToggleSortingHandler()}
															className="inline-flex items-center gap-1 rounded outline-none hover:text-[var(--sea-ink)] focus-visible:ring-[3px] focus-visible:ring-ring/50"
														>
															{flexRender(header.column.columnDef.header, header.getContext())}
															{sorted === "asc" ? (
																<ArrowUp className="size-3.5" aria-hidden="true" />
															) : sorted === "desc" ? (
																<ArrowDown className="size-3.5" aria-hidden="true" />
															) : (
																<ArrowUpDown className="size-3.5 opacity-40" aria-hidden="true" />
															)}
														</button>
													) : (
														flexRender(header.column.columnDef.header, header.getContext())
													)}
												</th>
											);
										})}
									</tr>
								))}
							</thead>
							<tbody>
								{table.getRowModel().rows.map((row) => (
									<tr
										key={row.id}
										className="border-t border-[var(--line)] transition hover:bg-[var(--link-bg-hover)]"
									>
										{row.getAllCells().map((cell) => (
											<td key={cell.id} className="px-4 py-3 align-middle">
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Mobile: stacked cards instead of a wide table */}
					<ul className="grid gap-3 md:hidden">
						{table.getRowModel().rows.map((row) => {
							const p = row.original;
							return (
								<li key={row.id} className="island-shell rounded-2xl p-4">
									<div className="flex items-start gap-3">
										<ProductThumb src={p.imageUrl} size="size-14" />
										<div className="min-w-0 flex-1">
											<p className="m-0 truncate font-semibold text-[var(--sea-ink)]">{p.name}</p>
											<p className="m-0 mt-0.5 line-clamp-2 text-xs text-[var(--sea-ink-soft)]">
												{p.description}
											</p>
										</div>
									</div>
									<div className="mt-3 flex items-center justify-between gap-3">
										<p className="m-0 text-sm font-semibold text-[var(--sea-ink)]">
											{formatPrice(p.price)}
										</p>
										<StockBadge value={p.stock} />
									</div>
									{isAdmin && (
										<div className="mt-4 grid grid-cols-2 gap-2">
											<Button variant="outline" size="sm" onClick={() => openEdit(p)}>
												<Pencil className="size-3.5" aria-hidden="true" />
												Edit
											</Button>
											<Button
												variant="ghost"
												size="sm"
												className="text-red-600 hover:text-red-700 dark:text-red-400"
												onClick={() => setPendingDelete(p)}
											>
												<Trash2 className="size-3.5" aria-hidden="true" />
												Delete
											</Button>
										</div>
									)}
								</li>
							);
						})}
					</ul>
				</>
			)}

			{isAdmin && (
				<ProductFormModal
					open={modalOpen}
					onOpenChange={(next) => {
						if (!next) void closeModal();
					}}
					product={creating ? null : editing}
				/>
			)}

			<ConfirmDialog
				open={!!pendingDelete}
				onOpenChange={(next) => {
					if (!next) setPendingDelete(null);
				}}
				title="Delete this product?"
				description={`“${pendingDelete?.name ?? ""}” will be removed from the catalogue. This cannot be undone.`}
				confirmLabel="Delete product"
				pending={deleteMutation.isPending}
				onConfirm={() => {
					if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
				}}
			/>
		</>
	);
}
