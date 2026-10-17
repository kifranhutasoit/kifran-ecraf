import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
	createColumnHelper,
	flexRender,
	rowSortingFeature,
	tableFeatures,
	useTable,
} from "@tanstack/react-table";
import { ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { ProductFormModal } from "@/components/ProductFormModal";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { Product } from "@/lib/db";
import { getServerSession } from "@/lib/server/auth";
import { deleteProduct, getProducts } from "@/lib/server/products";

export const Route = createFileRoute("/")({
	beforeLoad: async () => {
		const { session } = await getServerSession();
		if (!session) {
			throw redirect({ to: "/login" });
		}
	},
	component: Products,
});

const EMPTY: Product[] = [];
const formatPrice = (value: number) => `$${Number(value).toFixed(2)}`;

function Thumb({ src, name }: { src: string | null; name: string }) {
	return src ? (
		<img
			src={src}
			alt={name}
			loading="lazy"
			referrerPolicy="no-referrer"
			className="size-12 shrink-0 rounded-lg border object-cover"
		/>
	) : (
		<div
			aria-hidden="true"
			className="grid size-12 shrink-0 place-items-center rounded-lg border bg-muted text-muted-foreground"
		>
			<ImageIcon className="size-5" />
		</div>
	);
}

function DeleteProductDialog({ product, onClose }: { product: Product; onClose: () => void }) {
	const queryClient = useQueryClient();
	const deleteFn = useServerFn(deleteProduct);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState("");

	async function confirmDelete() {
		setPending(true);
		setError("");
		try {
			await deleteFn({ data: { id: product.id } });
			await queryClient.invalidateQueries({ queryKey: ["products"] });
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Delete failed");
			setPending(false);
		}
	}

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open && !pending) onClose();
			}}
		>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Delete product?</DialogTitle>
					<DialogDescription>
						<strong>{product.name}</strong> will be permanently removed. This cannot be undone.
					</DialogDescription>
				</DialogHeader>
				{error && (
					<p role="alert" className="text-sm text-destructive">
						{error}
					</p>
				)}
				<DialogFooter className="gap-2">
					<Button variant="outline" disabled={pending} onClick={onClose}>
						Cancel
					</Button>
					<Button variant="destructive" disabled={pending} onClick={confirmDelete}>
						{pending ? "Deleting…" : "Delete"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function Products() {
	const productsQuery = useQuery({
		queryKey: ["products"],
		queryFn: async () => getProducts(),
	});

	// null = tertutup; { product: null } = mode tambah; { product } = mode edit
	const [editing, setEditing] = useState<{ product: Product | null } | null>(null);
	const [deleting, setDeleting] = useState<Product | null>(null);

	const products = productsQuery.data ?? EMPTY;

	const features = tableFeatures({ rowSortingFeature });
	const columnHelper = createColumnHelper<typeof features, Product>();

	const columns = columnHelper.columns([
		columnHelper.display({
			id: "image",
			header: "",
			cell: (info) => {
				const product = info.row.original as Product;
				return <Thumb src={product.image ?? null} name={product.name} />;
			},
		}),
		columnHelper.accessor("name", { header: "Name" }),
		columnHelper.accessor("description", { header: "Description" }),
		columnHelper.accessor("price", {
			header: "Price",
			cell: (info) => formatPrice(info.getValue()),
		}),
		columnHelper.accessor("stock", { header: "Stock" }),
		columnHelper.display({
			id: "actions",
			header: "Actions",
			cell: (info) => {
				const product = info.row.original as Product;
				return (
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							aria-label={`Edit ${product.name}`}
							onClick={() => setEditing({ product })}
						>
							<Pencil className="size-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							aria-label={`Delete ${product.name}`}
							className="text-destructive hover:text-destructive"
							onClick={() => setDeleting(product)}
						>
							<Trash2 className="size-4" />
						</Button>
					</div>
				);
			},
		}),
	]);

	const table = useTable({
		features,
		columns,
		data: products,
	});

	return (
		<main className="page-wrap px-4 py-8 sm:py-12">
			<section className="island-shell rounded-2xl p-4 sm:p-8">
				<div className="mb-6 flex flex-wrap items-center justify-between gap-4">
					<div>
						<p className="island-kicker mb-2">Products</p>
						<h1 className="display-title mb-1 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
							Products
						</h1>
						<p className="m-0 text-[var(--sea-ink-soft)]">
							Manage your catalogue. Changes are admin only.
						</p>
					</div>
					<Button onClick={() => setEditing({ product: null })}>
						<Plus className="size-4" /> Add product
					</Button>
				</div>

				{/* Loading */}
				{productsQuery.isPending && (
					<div className="space-y-3" aria-busy="true" aria-label="Loading products">
						{["a", "b", "c"].map((key) => (
							<div key={key} className="h-16 animate-pulse rounded-xl bg-[var(--chip-bg)]" />
						))}
					</div>
				)}

				{/* Error */}
				{productsQuery.isError && (
					<div
						role="alert"
						className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
					>
						<span>Failed to load products: {(productsQuery.error as Error).message}</span>
						<Button variant="outline" size="sm" onClick={() => productsQuery.refetch()}>
							Retry
						</Button>
					</div>
				)}

				{/* Empty */}
				{productsQuery.isSuccess && products.length === 0 && (
					<div className="rounded-xl border border-dashed border-[var(--line)] px-4 py-12 text-center">
						<p className="mb-4 text-[var(--sea-ink-soft)]">
							No products yet. Add one to get started.
						</p>
						<Button onClick={() => setEditing({ product: null })}>
							<Plus className="size-4" /> Add product
						</Button>
					</div>
				)}

				{productsQuery.isSuccess && products.length > 0 && (
					<>
						{/* Mobile: kartu */}
						<ul className="space-y-3 md:hidden">
							{products.map((product) => (
								<li
									key={product.id}
									className="flex gap-3 rounded-xl border border-[var(--line)] p-3"
								>
									<Thumb src={product.image ?? null} name={product.name} />
									<div className="min-w-0 flex-1">
										<p className="truncate font-semibold text-[var(--sea-ink)]">{product.name}</p>
										<p className="line-clamp-2 text-sm text-[var(--sea-ink-soft)]">
											{product.description}
										</p>
										<p className="mt-1 text-sm">
											{formatPrice(product.price)} · Stock {product.stock}
										</p>
									</div>
									<div className="flex flex-col">
										<Button
											variant="ghost"
											size="icon"
											aria-label={`Edit ${product.name}`}
											onClick={() => setEditing({ product })}
										>
											<Pencil className="size-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											aria-label={`Delete ${product.name}`}
											className="text-destructive hover:text-destructive"
											onClick={() => setDeleting(product)}
										>
											<Trash2 className="size-4" />
										</Button>
									</div>
								</li>
							))}
						</ul>

						{/* Desktop: tabel */}
						<div className="hidden overflow-x-auto md:block">
							<table className="w-full border-collapse text-sm">
								<thead>
									{table.getHeaderGroups().map((headerGroup) => (
										<tr key={headerGroup.id}>
											{headerGroup.headers.map((header) => (
												<th
													key={header.id}
													colSpan={header.colSpan}
													className="bg-[var(--chip-bg)] px-4 py-3 text-left text-xs font-semibold text-[var(--sea-ink-soft)]"
												>
													{header.isPlaceholder ? null : (
														<div
															{...{
																className: "flex cursor-pointer select-none items-center gap-1",
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
											))}
										</tr>
									))}
								</thead>
								<tbody>
									{table.getRowModel().rows.map((row) => (
										<tr key={row.id} className="border-b border-[var(--line)]">
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
					</>
				)}
			</section>

			{editing && (
				<ProductFormModal
					key={editing.product?.id ?? "new"}
					product={editing.product}
					onClose={() => setEditing(null)}
				/>
			)}
			{deleting && <DeleteProductDialog product={deleting} onClose={() => setDeleting(null)} />}
		</main>
	);
}
