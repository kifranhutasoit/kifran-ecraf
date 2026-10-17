import { Outlet, createFileRoute } from "@tanstack/react-router";

import Footer from "@/components/Footer";
import Header from "@/components/Header";

export const Route = createFileRoute("/_public")({
	component: PublicLayout,
});

function PublicLayout() {
	return (
		<div className="flex min-h-dvh flex-col">
			<Header />
			<div className="flex-1">
				<Outlet />
			</div>
			<Footer />
		</div>
	);
}
