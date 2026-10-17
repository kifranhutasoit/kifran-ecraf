import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import {
	LayoutDashboard,
	LogOut,
	Menu,
	Package,
	PanelLeftClose,
	PanelLeftOpen,
	Users,
	X,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import type { Role } from "@/lib/db";

const NAV = [
	{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
	{ to: "/products", label: "Products", icon: Package, adminOnly: false },
	{ to: "/users", label: "Users", icon: Users, adminOnly: true },
] as const;

type ShellUser = { name: string | null; email: string };

function SidebarBody({
	compact,
	role,
	user,
	signingOut,
	onSignOut,
	onNavigate,
}: {
	compact: boolean;
	role: Role;
	user: ShellUser;
	signingOut: boolean;
	onSignOut: () => void;
	onNavigate?: () => void;
}) {
	const items = NAV.filter((item) => !item.adminOnly || role === "admin");
	const initial = (user.name || user.email).charAt(0).toUpperCase();

	return (
		<>
			<nav aria-label="Main" className="flex-1 space-y-1 px-3 py-4">
				{items.map((item) => (
					<Link
						key={item.to}
						to={item.to}
						onClick={onNavigate}
						title={compact ? item.label : undefined}
						className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--sea-ink-soft)] no-underline transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)] ${
							compact ? "justify-center" : ""
						}`}
						activeProps={{
							className: "bg-[var(--chip-bg)] text-[var(--sea-ink)] shadow-sm",
						}}
					>
						<item.icon className="size-5 shrink-0" aria-hidden="true" />
						<span className={compact ? "sr-only" : ""}>{item.label}</span>
					</Link>
				))}
			</nav>

			<div className="border-t border-[var(--line)] p-3">
				<div className={`flex items-center gap-3 ${compact ? "justify-center" : ""}`}>
					<div
						aria-hidden="true"
						className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--chip-bg)] text-sm font-bold text-[var(--sea-ink)] ring-1 ring-[var(--chip-line)]"
					>
						{initial}
					</div>
					{!compact && (
						<div className="min-w-0 flex-1">
							<p className="m-0 truncate text-sm font-semibold text-[var(--sea-ink)]">
								{user.name || user.email}
							</p>
							<p className="m-0 text-xs text-[var(--sea-ink-soft)]">
								{role === "admin" ? "Administrator" : "User"}
							</p>
						</div>
					)}
				</div>
				<Button
					variant="ghost"
					size={compact ? "icon" : "sm"}
					className={`mt-3 text-[var(--sea-ink-soft)] ${compact ? "mx-auto flex" : "w-full justify-start"}`}
					onClick={onSignOut}
					disabled={signingOut}
					aria-label="Sign out"
					title="Sign out"
				>
					<LogOut className="size-4" aria-hidden="true" />
					{!compact && (signingOut ? "Signing out…" : "Sign out")}
				</Button>
			</div>
		</>
	);
}

export function DashboardShell({
	user,
	role,
	children,
}: {
	user: ShellUser;
	role: Role;
	children: ReactNode;
}) {
	const [collapsed, setCollapsed] = useState(false);
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [signingOut, setSigningOut] = useState(false);
	const router = useRouter();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	useEffect(() => {
		if (!drawerOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setDrawerOpen(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [drawerOpen]);

	async function handleSignOut() {
		setSigningOut(true);
		try {
			await authClient.signOut();
		} finally {
			// Bersihkan cache supaya data admin tidak terlihat oleh akun berikutnya di browser ini.
			queryClient.clear();
			await router.invalidate();
			await navigate({ to: "/login" });
			setSigningOut(false);
		}
	}

	const brand = (
		<span className="inline-flex items-center gap-2 text-base font-bold tracking-tight text-[var(--sea-ink)]">
			<span className="grid size-8 place-items-center rounded-lg bg-[linear-gradient(135deg,#56c6be,#2f6a4a)] text-white">
				<Package className="size-4" aria-hidden="true" />
			</span>
			Ekraf Dashboard
		</span>
	);

	return (
		<div className="flex min-h-dvh">
			{/* Desktop sidebar */}
			<aside
				className={`sticky top-0 hidden h-dvh shrink-0 flex-col self-start border-r border-[var(--line)] bg-[var(--header-bg)] backdrop-blur-lg transition-[width] duration-200 md:flex ${
					collapsed ? "w-[4.5rem]" : "w-64"
				}`}
			>
				<div
					className={`flex h-14 items-center border-b border-[var(--line)] px-3 ${
						collapsed ? "justify-center" : "justify-between"
					}`}
				>
					{!collapsed && brand}
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setCollapsed((v) => !v)}
						aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
						aria-expanded={!collapsed}
					>
						{collapsed ? (
							<PanelLeftOpen className="size-5" aria-hidden="true" />
						) : (
							<PanelLeftClose className="size-5" aria-hidden="true" />
						)}
					</Button>
				</div>
				<SidebarBody
					compact={collapsed}
					role={role}
					user={user}
					signingOut={signingOut}
					onSignOut={handleSignOut}
				/>
			</aside>

			{/* Mobile drawer */}
			{drawerOpen && (
				<div className="fixed inset-0 z-50 md:hidden">
					<button
						type="button"
						aria-label="Close menu"
						className="absolute inset-0 bg-black/50"
						onClick={() => setDrawerOpen(false)}
					/>
					<aside
						aria-label="Navigation"
						className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-[var(--line)] bg-[var(--bg-base)] shadow-xl"
					>
						<div className="flex h-14 items-center justify-between border-b border-[var(--line)] px-3">
							{brand}
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setDrawerOpen(false)}
								aria-label="Close menu"
							>
								<X className="size-5" aria-hidden="true" />
							</Button>
						</div>
						<SidebarBody
							compact={false}
							role={role}
							user={user}
							signingOut={signingOut}
							onSignOut={handleSignOut}
							onNavigate={() => setDrawerOpen(false)}
						/>
					</aside>
				</div>
			)}

			<div className="flex min-w-0 flex-1 flex-col">
				<header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
					<Button
						variant="ghost"
						size="icon"
						className="md:hidden"
						onClick={() => setDrawerOpen(true)}
						aria-label="Open menu"
					>
						<Menu className="size-5" aria-hidden="true" />
					</Button>
					<span className="md:hidden">{brand}</span>
					<div className="ml-auto">
						<ThemeToggle />
					</div>
				</header>
				<div className="flex-1">{children}</div>
			</div>
		</div>
	);
}
