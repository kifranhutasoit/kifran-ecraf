import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/users/$userId")({
	beforeLoad: () => {
		throw redirect({ to: "/users" });
	},
});
