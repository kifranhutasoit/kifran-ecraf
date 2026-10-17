import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, redirect, useNavigate, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getServerSession } from "@/lib/server/auth";
import { deleteProduct, getProducts, updateProduct } from "@/lib/server/products";

type Product = { id: string; name: string; description: string; price: number; stock: number };

export const Route = createFileRoute("/products/$productId")({
	beforeLoad: async () => {
		const { session } = await getServerSession();
		if (!session) {
			throw redirect({ to: "/login" });
		}
	},
	component: EditProduct,
});

function EditProduct() {
	const { productId } = useParams({ from: "/products/$productId" });

	const productQuery = useQuery({
		queryKey: ["product", productId],
		queryFn: async () => {
			const products = await getProducts();
			return products.find((p) => p.id === productId) ?? null;
		},
	});

	if (productQuery.isPending) {
		return <main className="page-wrap px-4 py-12">Loading product...</main>;
	}
	if (productQuery.isError) {
		return (
			<main className="page-wrap px-4 py-12">Error: {(productQuery.error as Error).message}</main>
		);
	}
	if (!productQuery.data) {
		return <main className="page-wrap px-4 py-12">Product not found.</main>;
	}

	return <EditProductForm product={productQuery.data as Product} />;
}

function EditProductForm({ product }: { product: Product }) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const updateFn = useServerFn(updateProduct);
	const deleteFn = useServerFn(deleteProduct);
	const [message, setMessage] = useState("");
	const [messageType, setMessageType] = useState<"success" | "error">("success");

	const form = useForm({
		defaultValues: {
			name: product.name,
			description: product.description,
			price: String(product.price),
			stock: String(product.stock),
		},
		onSubmit: async ({ value }) => {
			setMessage("");
			try {
				await updateFn({
					data: {
						id: product.id,
						name: value.name.trim(),
						description: value.description.trim(),
						price: Number(value.price),
						stock: Number(value.stock),
					},
				});
				setMessageType("success");
				setMessage("Product updated successfully.");
				await queryClient.invalidateQueries({ queryKey: ["products"] });
				await queryClient.invalidateQueries({ queryKey: ["product", product.id] });
			} catch (err) {
				setMessageType("error");
				setMessage(err instanceof Error ? err.message : "Update failed");
			}
		},
	});

	const handleDelete = async () => {
		if (!window.confirm("Delete this product?")) return;
		try {
			await deleteFn({ data: { id: product.id } });
			await queryClient.invalidateQueries({ queryKey: ["products"] });
			navigate({ to: "/products" });
		} catch (err) {
			setMessageType("error");
			setMessage(err instanceof Error ? err.message : "Delete failed");
		}
	};

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell rounded-2xl p-6 sm:p-8">
				<div className="flex items-center gap-3 mb-6">
					<Link to="/products" className="text-xs underline underline-offset-4">
						&larr; Back to products
					</Link>
					<h1 className="display-title text-3xl font-bold sm:text-4xl">Edit Product</h1>
				</div>

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
					<form.Field
						name="name"
						validators={{
							onChange: ({ value }) => (value.trim() ? undefined : "Name is required"),
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="name">Name</Label>
								<Input
									id="name"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
								{field.state.meta.errors.length > 0 && (
									<p className="text-xs text-red-600">{field.state.meta.errors.join(", ")}</p>
								)}
							</div>
						)}
					</form.Field>

					<form.Field
						name="description"
						validators={{
							onChange: ({ value }) => (value.trim() ? undefined : "Description is required"),
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="description">Description</Label>
								<Input
									id="description"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
								{field.state.meta.errors.length > 0 && (
									<p className="text-xs text-red-600">{field.state.meta.errors.join(", ")}</p>
								)}
							</div>
						)}
					</form.Field>

					<div className="grid gap-4 sm:grid-cols-2">
						<form.Field
							name="price"
							validators={{
								onChange: ({ value }) =>
									Number.isFinite(Number(value)) && Number(value) >= 0
										? undefined
										: "Price must be 0 or more",
							}}
						>
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor="price">Price</Label>
									<Input
										id="price"
										type="number"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
									{field.state.meta.errors.length > 0 && (
										<p className="text-xs text-red-600">{field.state.meta.errors.join(", ")}</p>
									)}
								</div>
							)}
						</form.Field>

						<form.Field
							name="stock"
							validators={{
								onChange: ({ value }) =>
									Number.isInteger(Number(value)) && Number(value) >= 0
										? undefined
										: "Stock must be a whole number, 0 or more",
							}}
						>
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor="stock">Stock</Label>
									<Input
										id="stock"
										type="number"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
									{field.state.meta.errors.length > 0 && (
										<p className="text-xs text-red-600">{field.state.meta.errors.join(", ")}</p>
									)}
								</div>
							)}
						</form.Field>
					</div>

					<form.Subscribe selector={(s) => s.isSubmitting}>
						{(isSubmitting) => (
							<div className="pt-6 flex gap-3">
								<Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
									{isSubmitting ? "Saving..." : "Save Changes"}
								</Button>
								<button
									type="button"
									onClick={handleDelete}
									disabled={isSubmitting}
									className="w-full sm:w-auto bg-red-50 border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 rounded-xl hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 disabled:opacity-50"
								>
									Delete Product
								</button>
							</div>
						)}
					</form.Subscribe>
				</form>
			</section>
		</main>
	);
}
