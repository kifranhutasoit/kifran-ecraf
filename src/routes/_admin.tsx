import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { AdminShell } from "@/components/AdminShell";
import { getServerSession } from "@/lib/server/auth";

/**
 * Guard for every admin-area page (dashboard, products, users).
 * Signed-out visitors are sent to /login and returned here afterwards.
 */
export const Route = createFileRoute("/_admin")({
	beforeLoad: async ({ location }) => {
		const { session, user, role } = await getServerSession();
		if (!session || !user || !role) {
			throw redirect({ to: "/login", search: { redirect: location.href } });
		}
		return { currentUser: user, role };
	},
	component: AdminLayout,
});

function AdminLayout() {
	const { currentUser, role } = Route.useRouteContext();
	return (
		<AdminShell user={currentUser} role={role}>
			<Outlet />
		</AdminShell>
	);
}
