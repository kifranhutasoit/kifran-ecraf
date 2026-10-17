import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

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
import { deleteProduct, getProducts } from "@/lib/server/products";

export const Route = createFileRoute("/_admin/products/")({
	component: ProductsPage,
});

type SortKey = "name" | "price" | "stock";
type SortDir = "asc" | "desc";

const formatPrice = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 2 });

function SortHeader({
	label,
	k,
	sortKey,
	sortDir,
	onToggle,
}: {
	label: string;
	k: SortKey;
	sortKey: SortKey;
	sortDir: SortDir;
	onToggle: (key: SortKey) => void;
}) {
	const active = sortKey === k;
	return (
		<button
			type="button"
			onClick={() => onToggle(k)}
			className="inline-flex items-center gap-1 font-semibold hover:underline"
		>
			{label}
			{active && (sortDir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
		</button>
	);
}

function ProductThumb({ product }: { product: Product }) {
	if (!product.image) {
		return (
			<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--chip-bg)] text-[var(--sea-ink-soft)]">
				<Package size={20} />
			</div>
		);
	}
	return (
		<img
			src={product.image}
			alt={product.name}
			referrerPolicy="no-referrer"
			className="h-12 w-12 shrink-0 rounded-lg object-cover"
		/>
	);
}

function ProductsPage() {
	const queryClient = useQueryClient();
	const { role } = Route.useRouteContext();
	const isAdmin = role === "admin";

	const [sortKey, setSortKey] = useState<SortKey>("name");
	const [sortDir, setSortDir] = useState<SortDir>("asc");
	const [formOpen, setFormOpen] = useState(false);
	const [editing, setEditing] = useState<Product | null>(null);
	const [deleting, setDeleting] = useState<Product | null>(null);

	const productsQuery = useQuery({
		queryKey: ["products"],
		queryFn: async () => getProducts(),
	});

	const refresh = () => {
		queryClient.invalidateQueries({ queryKey: ["products"] });
		queryClient.invalidateQueries({ queryKey: ["dashboard"] });
	};

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => deleteProduct({ data: { id } }),
		onSuccess: () => {
			setDeleting(null);
			refresh();
		},
	});

	const products = useMemo(() => {
		const list = [...(productsQuery.data ?? [])];
		list.sort((a, b) => {
			const av = a[sortKey];
			const bv = b[sortKey];
			const result =
				typeof av === "string" && typeof bv === "string"
					? av.localeCompare(bv)
					: Number(av) - Number(bv);
			return sortDir === "asc" ? result : -result;
		});
		return list;
	}, [productsQuery.data, sortKey, sortDir]);

	function toggleSort(key: SortKey) {
		if (key === sortKey) {
			setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setSortKey(key);
			setSortDir("asc");
		}
	}

	function openCreate() {
		setEditing(null);
		setFormOpen(true);
	}

	function openEdit(product: Product) {
		setEditing(product);
		setFormOpen(true);
	}

	const sortProps = { sortKey, sortDir, onToggle: toggleSort };

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell rounded-2xl p-6 sm:p-8">
				<div className="mb-6 flex flex-wrap items-center justify-between gap-4">
					<div>
						<p className="island-kicker mb-2">Products</p>
						<h1 className="display-title mb-1 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
							Products
						</h1>
						<p className="m-0 text-[var(--sea-ink-soft)]">
							Manage your catalogue. Changes are validated on the server.
						</p>
					</div>
					{isAdmin && (
						<Button onClick={openCreate}>
							<Plus size={16} className="mr-1" /> Add product
						</Button>
					)}
				</div>

				{productsQuery.isPending && (
					<p className="text-sm text-[var(--sea-ink-soft)]">Loading products…</p>
				)}

				{productsQuery.isError && (
					<div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-600">
						Failed to load products: {(productsQuery.error as Error).message}
						<div className="mt-2">
							<Button variant="outline" size="sm" onClick={() => productsQuery.refetch()}>
								Try again
							</Button>
						</div>
					</div>
				)}

				{productsQuery.isSuccess && products.length === 0 && (
					<div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--line)] p-10 text-center">
						<Package size={32} className="text-[var(--sea-ink-soft)]" />
						<p className="m-0 font-medium text-[var(--sea-ink)]">No products yet</p>
						<p className="m-0 text-sm text-[var(--sea-ink-soft)]">
							{isAdmin ? "Click “Add product” to create the first one." : "Nothing to show."}
						</p>
					</div>
				)}

				{products.length > 0 && (
					<>
						{/* Desktop: tabel */}
						<div className="hidden overflow-x-auto md:block">
							<table className="w-full text-left text-sm text-[var(--sea-ink)]">
								<thead>
									<tr className="border-b border-[var(--line)]">
										<th className="py-3 pr-4">Image</th>
										<th className="py-3 pr-4">
											<SortHeader label="Name" k="name" {...sortProps} />
										</th>
										<th className="py-3 pr-4">Description</th>
										<th className="py-3 pr-4">
											<SortHeader label="Price" k="price" {...sortProps} />
										</th>
										<th className="py-3 pr-4">
											<SortHeader label="Stock" k="stock" {...sortProps} />
										</th>
										{isAdmin && <th className="py-3 text-right">Actions</th>}
									</tr>
								</thead>
								<tbody>
									{products.map((p) => (
										<tr key={p.id} className="border-b border-[var(--line)] align-middle">
											<td className="py-3 pr-4">
												<ProductThumb product={p} />
											</td>
											<td className="py-3 pr-4 font-medium">{p.name}</td>
											<td className="max-w-xs truncate py-3 pr-4 text-[var(--sea-ink-soft)]">
												{p.description}
											</td>
											<td className="py-3 pr-4">{formatPrice(p.price)}</td>
											<td className="py-3 pr-4">{p.stock}</td>
											{isAdmin && (
												<td className="py-3 text-right">
													<div className="inline-flex gap-2">
														<Button variant="outline" size="sm" onClick={() => openEdit(p)}>
															<Pencil size={14} className="mr-1" /> Edit
														</Button>
														<Button variant="outline" size="sm" onClick={() => setDeleting(p)}>
															<Trash2 size={14} className="mr-1" /> Delete
														</Button>
													</div>
												</td>
											)}
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{/* Mobile: kartu */}
						<div className="grid gap-3 md:hidden">
							<div className="flex flex-wrap items-center gap-3 text-xs text-[var(--sea-ink-soft)]">
								<span>Sort by:</span>
								<SortHeader label="Name" k="name" {...sortProps} />
								<SortHeader label="Price" k="price" {...sortProps} />
								<SortHeader label="Stock" k="stock" {...sortProps} />
							</div>
							{products.map((p) => (
								<div
									key={p.id}
									className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-4"
								>
									<div className="flex gap-3">
										<ProductThumb product={p} />
										<div className="min-w-0 flex-1">
											<p className="m-0 font-semibold text-[var(--sea-ink)]">{p.name}</p>
											<p className="m-0 mt-1 text-sm text-[var(--sea-ink-soft)]">{p.description}</p>
											<p className="m-0 mt-2 text-sm text-[var(--sea-ink)]">
												{formatPrice(p.price)} · Stock {p.stock}
											</p>
										</div>
									</div>
									{isAdmin && (
										<div className="mt-3 flex gap-2">
											<Button variant="outline" size="sm" onClick={() => openEdit(p)}>
												<Pencil size={14} className="mr-1" /> Edit
											</Button>
											<Button variant="outline" size="sm" onClick={() => setDeleting(p)}>
												<Trash2 size={14} className="mr-1" /> Delete
											</Button>
										</div>
									)}
								</div>
							))}
						</div>
					</>
				)}
			</section>

			{/* Modal create / edit. `key` memaksa form dibuat ulang untuk tiap produk. */}
			{formOpen && (
				<ProductFormModal
					key={editing?.id ?? "new"}
					product={editing}
					onClose={() => {
						setFormOpen(false);
						setEditing(null);
						queryClient.invalidateQueries({ queryKey: ["dashboard"] });
					}}
				/>
			)}

			{/* Konfirmasi hapus */}
			<Dialog
				open={deleting !== null}
				onOpenChange={(open) => {
					if (!open && !deleteMutation.isPending) {
						setDeleting(null);
						deleteMutation.reset();
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete product?</DialogTitle>
						<DialogDescription>
							“{deleting?.name}” will be permanently removed. This cannot be undone.
						</DialogDescription>
					</DialogHeader>
					{deleteMutation.isError && (
						<p className="text-sm text-red-600">{(deleteMutation.error as Error).message}</p>
					)}
					<DialogFooter>
						<Button
							variant="outline"
							disabled={deleteMutation.isPending}
							onClick={() => setDeleting(null)}
						>
							Cancel
						</Button>
						<Button
							disabled={deleteMutation.isPending}
							onClick={() => deleting && deleteMutation.mutate(deleting.id)}
						>
							{deleteMutation.isPending ? "Deleting…" : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</main>
	);
}
