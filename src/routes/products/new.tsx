import { useForm } from "@tanstack/react-form";
import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getServerSession } from "@/lib/server/auth";
import { createProduct } from "@/lib/server/products";

type FormData = {
	name: string;
	description: string;
	price: string;
	stock: string;
};

export const Route = createFileRoute("/products/new")({
	beforeLoad: async () => {
		const { session } = await getServerSession();
		if (!session) {
			return redirect({ to: "/demo/better-auth" }) as any;
		}
	},
	component: NewProduct,
});

function NewProduct() {
	const navigate = useNavigate();
	const createFn = useServerFn(createProduct);
	const [message, setMessage] = useState("");
	const [messageType, setMessageType] = useState<"success" | "error">("success");

	const form = useForm({
		defaultValues: {
			name: "",
			description: "",
			price: "",
			stock: "",
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
				await createFn({
					data: {
						name: value.name,
						description: value.description,
						price,
						stock,
					},
				});
				setMessageType("success");
				setMessage("Product created successfully.");
				navigate({ to: "/products" });
			} catch (err) {
				setMessageType("error");
				setMessage(err instanceof Error ? err.message : "Create failed");
			}
		},
	});

	const errorsFor = (name: keyof FormData) => form.getFieldMeta(name)?.errors ?? [];

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
						Add Product
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
								placeholder="e.g. Starter Kit"
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
								placeholder="e.g. Everything you need to begin."
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
									placeholder="0.00"
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
									placeholder="0"
									className="w-full"
								/>
								{errorsFor("stock").length > 0 && (
									<p className="text-xs text-red-600">{errorsFor("stock").join(", ")}</p>
								)}
							</div>
						</div>

						<div className="pt-4 flex justify-end">
							<Button type="submit" disabled={form.state.isSubmitting} className="w-full sm:w-auto">
								{form.state.isSubmitting ? "Creating..." : "Create Product"}
							</Button>
						</div>
					</form>
				</>
			</section>
		</main>
	);
}
