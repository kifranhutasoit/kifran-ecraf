import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, redirect, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getServerSession } from "@/lib/server/auth";
import { deleteProduct, getProducts, updateProduct } from "@/lib/server/products";

type FormData = {
	name: string;
	description: string;
	price: string;
	stock: string;
};

export const Route = createFileRoute("/products/$productId")({
	beforeLoad: async () => {
		const { session } = await getServerSession();
		if (!session) {
			return redirect({ to: "/demo/better-auth" }) as any;
		}
	},
	component: EditProduct,
});

function EditProduct() {
	const { productId } = useParams({
		from: "/products/$productId",
	});
	const queryClient = useQueryClient();
	const updateFn = useServerFn(updateProduct);
	const deleteFn = useServerFn(deleteProduct);
	const [message, setMessage] = useState("");
	const [messageType, setMessageType] = useState<"success" | "error">("success");

	const productQuery = useQuery({
		queryKey: ["product", productId],
		queryFn: async () => {
			const products = await getProducts();
			return products.find((p) => p.id === productId);
		},
		enabled: !!productId,
	});
	const product = productQuery.data;

	if (productQuery.isPending) {
		return (
			<main className="page-wrap px-4 py-12">
				<p className="text-[var(--sea-ink-soft)]">Loading product...</p>
			</main>
		);
	}
	if (productQuery.isError) {
		return (
			<main className="page-wrap px-4 py-12">
				<p className="text-[var(--sea-ink-soft)]">Error: {(productQuery.error as Error).message}</p>
			</main>
		);
	}
	if (!product) {
		return (
			<main className="page-wrap px-4 py-12">
				<p className="text-[var(--sea-ink-soft)]">Product not found.</p>
			</main>
		);
	}

	const form = useForm({
		defaultValues: {
			name: product.name,
			description: product.description,
			price: String(product.price),
			stock: String(product.stock),
		} as FormData,
		onSubmit: async ({ value }) => {
			setMessage("");
			if (!value.name || !value.description) {
				setMessageType("error");
				setMessage("Name and description are required.");
				return;
			}
			const price = Number(value.price);
			const stock = Number(value.stock);
			if (!Number.isFinite(price) || price < 0) {
				setMessageType("error");
				setMessage("Price must be a valid positive number.");
				return;
			}
			if (!Number.isFinite(stock) || stock < 0) {
				setMessageType("error");
				setMessage("Stock must be a valid positive number.");
				return;
			}
			try {
				await updateFn({
					data: {
						id: productId,
						name: value.name,
						description: value.description,
						price,
						stock,
					},
				});
				setMessageType("success");
				setMessage("Product updated successfully.");
				await queryClient.invalidateQueries({ queryKey: ["products"] });
			} catch (err) {
				setMessageType("error");
				setMessage(err instanceof Error ? err.message : "Update failed");
			}
		},
	});

	const errorsFor = (name: keyof FormData) => form.getFieldMeta(name)?.errors ?? [];

	const handleDelete = async () => {
		if (!window.confirm("Delete this product?")) {
			return;
		}
		try {
			await deleteFn({ data: { id: productId } });
			await queryClient.invalidateQueries({ queryKey: ["products"] });
			window.location.href = "/products";
		} catch (err) {
			setMessageType("error");
			setMessage(err instanceof Error ? err.message : "Delete failed");
		}
	};

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell rounded-2xl p-6 sm:p-8">
				<div className="flex items-center gap-3 mb-6">
					<Link
						to="/products"
						className="text-xs text-[var(--sea-ink-soft)] underline underline-offset-4 hover:text-[var(--sea-ink)]"
					>
						&larr; Back to products
					</Link>
					<h1 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
						Edit Product
					</h1>
				</div>

				<>
					{message && (
						<div
							className={`mb-5 p-4 rounded-xl border ${
								messageType === "success"
									? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
									: "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
							}`}
						>
							{message}
						</div>
					)}

					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="space-y-5"
					>
						<div className="space-y-2">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								value={form.getFieldValue("name")}
								onChange={(e) => form.setFieldValue("name", e.target.value)}
								className="w-full"
							/>
							{errorsFor("name").length > 0 && (
								<p className="text-xs text-red-600">{errorsFor("name").join(", ")}</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="description">Description</Label>
							<Input
								id="description"
								value={form.getFieldValue("description")}
								onChange={(e) => form.setFieldValue("description", e.target.value)}
								className="w-full"
							/>
							{errorsFor("description").length > 0 && (
								<p className="text-xs text-red-600">{errorsFor("description").join(", ")}</p>
							)}
						</div>

						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="price">Price</Label>
								<Input
									id="price"
									type="number"
									value={form.getFieldValue("price")}
									onChange={(e) => form.setFieldValue("price", e.target.value)}
									className="w-full"
								/>
								{errorsFor("price").length > 0 && (
									<p className="text-xs text-red-600">{errorsFor("price").join(", ")}</p>
								)}
							</div>
							<div className="space-y-2">
								<Label htmlFor="stock">Stock</Label>
								<Input
									id="stock"
									type="number"
									value={form.getFieldValue("stock")}
									onChange={(e) => form.setFieldValue("stock", e.target.value)}
									className="w-full"
								/>
								{errorsFor("stock").length > 0 && (
									<p className="text-xs text-red-600">{errorsFor("stock").join(", ")}</p>
								)}
							</div>
						</div>

						<div className="pt-6 flex gap-3">
							<Button type="submit" disabled={form.state.isSubmitting} className="w-full sm:w-auto">
								{form.state.isSubmitting ? "Saving..." : "Save Changes"}
							</Button>
							<button
								type="button"
								onClick={handleDelete}
								className="w-full sm:w-auto bg-red-50 border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 rounded-xl hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-800/30 transition-colors disabled:opacity-50"
								disabled={form.state.isSubmitting}
							>
								Delete Product
							</button>
						</div>
					</form>
				</>
			</section>
		</main>
	);
}
