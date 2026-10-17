import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { DashboardShell } from "@/components/DashboardShell";
import { getServerSession } from "@/lib/server/auth";

export const Route = createFileRoute("/_admin")({
	beforeLoad: async () => {
		const { user, role } = await getServerSession();
		if (!user) {
			throw redirect({ to: "/login" });
		}
		return { user, role: role ?? ("user" as const) };
	},
	component: AdminLayout,
});

function AdminLayout() {
	const { user, role } = Route.useRouteContext();
	return (
		<DashboardShell user={user} role={role}>
			<Outlet />
		</DashboardShell>
	);
}
