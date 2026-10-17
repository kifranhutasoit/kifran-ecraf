import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/products/new")({
	beforeLoad: () => {
		throw redirect({ to: "/products", search: { new: true } });
	},
});
