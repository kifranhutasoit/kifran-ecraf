import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
	beforeLoad: () => {
		return redirect({ to: "/demo/better-auth" }) as any;
	},
});
