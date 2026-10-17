import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/products/$productId")({
	beforeLoad: ({ params }) => {
		throw redirect({ to: "/products", search: { edit: params.productId } });
	},
});
