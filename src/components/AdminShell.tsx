import { Link } from "@tanstack/react-router";
import { ChevronsLeft, ChevronsRight, LayoutDashboard, Menu, Package, Users } from "lucide-react";
import type * as React from "react";
import { useState } from "react";

import { SignOutButton, UserAvatar } from "#/integrations/better-auth/header-user";
import type { Role } from "#/lib/db";
import { cn } from "#/lib/utils";

import Footer from "./Footer";
import ThemeToggle from "./ThemeToggle";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";

const COLLAPSED_KEY = "admin-sidebar-collapsed";

const NAV_ITEMS = [
	{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
	{ to: "/products", label: "Products", icon: Package, adminOnly: false },
	{ to: "/users", label: "Users", icon: Users, adminOnly: true },
] as const;

function readCollapsed(): boolean {
	try {
		return window.localStorage.getItem(COLLAPSED_KEY) === "1";
	} catch {
		return false;
	}
}

function writeCollapsed(value: boolean) {
	try {
		window.localStorage.setItem(COLLAPSED_KEY, value ? "1" : "0");
	} catch {
		// Preference just won't persist.
	}
}

function Brand({ compact }: { compact: boolean }) {
	return (
		<Link to="/dashboard" className="flex items-center gap-2 rounded-lg px-2 py-1.5 no-underline">
			<span className="size-2.5 shrink-0 rounded-full bg-[var(--palm)]" aria-hidden="true" />
			{!compact && (
				<span className="display-title truncate text-lg font-bold text-[var(--sea-ink)]">
					Ekraf
				</span>
			)}
		</Link>
	);
}

function NavList({
	role,
	compact,
	onNavigate,
}: {
	role: Role;
	compact: boolean;
	onNavigate?: () => void;
}) {
	const items = NAV_ITEMS.filter((item) => !item.adminOnly || role === "admin");
	return (
		<nav aria-label="Admin navigation" className="flex flex-col gap-1">
			{items.map((item) => {
				const Icon = item.icon;
				return (
					<Link
						key={item.to}
						to={item.to}
						onClick={onNavigate}
						aria-label={compact ? item.label : undefined}
						title={compact ? item.label : undefined}
						className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--sea-ink-soft)] no-underline transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
						activeProps={{
							className:
								"bg-[var(--chip-bg)] text-[var(--sea-ink)] ring-1 ring-[var(--chip-line)] shadow-[0_8px_20px_rgba(30,90,72,0.08)]",
						}}
					>
						<Icon className="size-5 shrink-0" aria-hidden="true" />
						{!compact && <span className="truncate">{item.label}</span>}
					</Link>
				);
			})}
		</nav>
	);
}

export function AdminShell({
	user,
	role,
	children,
}: {
	user: { name?: string | null; email: string };
	role: Role;
	children: React.ReactNode;
}) {
	const [collapsed, setCollapsed] = useState(readCollapsed);
	const [drawerOpen, setDrawerOpen] = useState(false);

	const toggleCollapsed = () => {
		setCollapsed((prev) => {
			writeCollapsed(!prev);
			return !prev;
		});
	};

	return (
		<div className="flex min-h-dvh">
			{/* Desktop sidebar */}
			<aside
				aria-label="Sidebar"
				className={cn(
					"sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-[var(--line)] bg-[var(--header-bg)] p-3 backdrop-blur-lg transition-[width] duration-200 md:flex",
					collapsed ? "w-[72px]" : "w-64",
				)}
			>
				<div
					className={cn("mb-4 flex items-center", collapsed ? "justify-center" : "justify-between")}
				>
					<Brand compact={collapsed} />
				</div>
				<NavList role={role} compact={collapsed} />
				<div className="mt-auto">
					<button
						type="button"
						onClick={toggleCollapsed}
						aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
						aria-expanded={!collapsed}
						className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
					>
						{collapsed ? (
							<ChevronsRight className="size-5 shrink-0" aria-hidden="true" />
						) : (
							<ChevronsLeft className="size-5 shrink-0" aria-hidden="true" />
						)}
						{!collapsed && <span>Collapse</span>}
					</button>
				</div>
			</aside>

			{/* Mobile drawer */}
			<Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
				<DialogContent
					showCloseButton
					className="top-0 left-0 h-dvh max-h-none w-72 max-w-[85vw] translate-x-0 translate-y-0 gap-6 rounded-none rounded-r-2xl border-y-0 border-l-0 p-5"
				>
					<DialogTitle className="sr-only">Navigation</DialogTitle>
					<Brand compact={false} />
					<NavList role={role} compact={false} onNavigate={() => setDrawerOpen(false)} />
					<div className="mt-auto flex flex-col gap-3 border-t border-[var(--line)] pt-4">
						<div className="flex items-center gap-3">
							<UserAvatar name={user.name} email={user.email} />
							<div className="min-w-0">
								<p className="m-0 truncate text-sm font-semibold text-[var(--sea-ink)]">
									{user.name || user.email}
								</p>
								<p className="m-0 text-xs text-[var(--sea-ink-soft)]">
									{role === "admin" ? "Administrator" : "User"}
								</p>
							</div>
						</div>
						<SignOutButton className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 text-sm font-semibold text-[var(--sea-ink)]" />
					</div>
				</DialogContent>
			</Dialog>

			<div className="flex min-w-0 flex-1 flex-col">
				{/* Mobile top bar */}
				<header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 py-3 backdrop-blur-lg md:hidden">
					<button
						type="button"
						onClick={() => setDrawerOpen(true)}
						aria-label="Open navigation"
						className="inline-flex size-9 items-center justify-center rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] text-[var(--sea-ink)] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
					>
						<Menu className="size-4" aria-hidden="true" />
					</button>
					<Brand compact={false} />
					<ThemeToggle />
				</header>

				{/* Desktop top bar */}
				<header className="sticky top-0 z-30 hidden items-center justify-end gap-3 border-b border-[var(--line)] bg-[var(--header-bg)] px-8 py-3 backdrop-blur-lg md:flex">
					<div className="mr-auto text-sm text-[var(--sea-ink-soft)]">
						Signed in as <span className="font-semibold text-[var(--sea-ink)]">{user.email}</span>
					</div>
					<ThemeToggle />
					<SignOutButton />
				</header>

				<main id="main" className="flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-8">
					<div className="mx-auto w-full max-w-6xl">{children}</div>
				</main>
				<Footer />
			</div>
		</div>
	);
}
