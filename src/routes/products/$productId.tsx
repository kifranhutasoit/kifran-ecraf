import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getServerSession } from "@/lib/server/auth";
import { createProduct } from "@/lib/server/products";

export const Route = createFileRoute("/products/$productId")({
	beforeLoad: async () => {
		const { session } = await getServerSession();
		if (!session) {
			throw redirect({ to: "/login" });
		}
	},
	component: NewProduct,
});

function FieldError({ errors }: { errors: unknown[] }) {
	if (errors.length === 0) return null;
	return <p className="text-xs text-red-600">{errors.map(String).join(", ")}</p>;
}

function NewProduct() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const createFn = useServerFn(createProduct);
	const [error, setError] = useState("");

	const form = useForm({
		defaultValues: { name: "", description: "", price: "", stock: "" },
		onSubmit: async ({ value }) => {
			setError("");
			try {
				await createFn({
					data: {
						name: value.name.trim(),
						description: value.description.trim(),
						price: Number(value.price),
						stock: Number(value.stock),
					},
				});
				await queryClient.invalidateQueries({ queryKey: ["products"] });
				navigate({ to: "/products" });
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to create product");
			}
		},
	});

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell rounded-2xl p-6 sm:p-8">
				<div className="flex items-center gap-3 mb-6">
					<Link to="/products" className="text-xs underline underline-offset-4">
						&larr; Back to products
					</Link>
					<h1 className="display-title text-3xl font-bold sm:text-4xl">Add Product</h1>
				</div>

				{error && (
					<div className="mb-5 p-4 rounded-xl border bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
						{error}
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
									placeholder="e.g. Starter Kit"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
								<FieldError errors={field.state.meta.errors} />
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
									placeholder="e.g. Everything you need to begin."
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
								<FieldError errors={field.state.meta.errors} />
							</div>
						)}
					</form.Field>

					<div className="grid gap-4 sm:grid-cols-2">
						<form.Field
							name="price"
							validators={{
								onChange: ({ value }) =>
									value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0
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
										min="0"
										step="0.01"
										placeholder="0.00"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
									<FieldError errors={field.state.meta.errors} />
								</div>
							)}
						</form.Field>

						<form.Field
							name="stock"
							validators={{
								onChange: ({ value }) =>
									value !== "" && Number.isInteger(Number(value)) && Number(value) >= 0
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
										min="0"
										step="1"
										placeholder="0"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
									<FieldError errors={field.state.meta.errors} />
								</div>
							)}
						</form.Field>
					</div>

					<form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
						{([canSubmit, isSubmitting]) => (
							<div className="pt-6 flex justify-end">
								<Button type="submit" disabled={!canSubmit || isSubmitting}>
									{isSubmitting ? "Creating..." : "Create Product"}
								</Button>
							</div>
						)}
					</form.Subscribe>
				</form>
			</section>
		</main>
	);
}