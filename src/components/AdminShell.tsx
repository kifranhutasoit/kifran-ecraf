import { Link } from "@tanstack/react-router";
import {
	ChevronsLeft,
	ChevronsRight,
	LayoutDashboard,
	LogOut,
	Menu,
	Package,
	Plus,
	Users,
	X,
} from "lucide-react";
import { DropdownMenu } from "radix-ui";
import type * as React from "react";
import { useState } from "react";

import { UserAvatar, signOutAndReload } from "#/integrations/better-auth/header-user";
import type { Role } from "#/lib/db";
import { cn } from "#/lib/utils";

import Footer from "./Footer";
import ThemeToggle from "./ThemeToggle";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "./ui/dialog";

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

const focusRing = "outline-none focus-visible:ring-[3px] focus-visible:ring-white/60";

function Brand({ compact, onNavigate }: { compact: boolean; onNavigate?: () => void }) {
	return (
		<Link
			to="/dashboard"
			onClick={onNavigate}
			aria-label="Ekraf, go to dashboard"
			className={cn(
				"block truncate text-3xl font-semibold uppercase text-white no-underline hover:text-gray-300",
				focusRing,
			)}
		>
			{compact ? "E" : "Ekraf"}
		</Link>
	);
}

/** Template call-to-action: white button, green text, one squared corner. */
function AddProductCta({ compact, onNavigate }: { compact: boolean; onNavigate?: () => void }) {
	return (
		<Link
			to="/products"
			search={{ new: true }}
			onClick={onNavigate}
			aria-label={compact ? "Add product" : undefined}
			title={compact ? "Add product" : undefined}
			className={cn(
				"mt-5 flex w-full items-center justify-center rounded-tr-lg rounded-br-lg rounded-bl-lg bg-white py-2 font-semibold text-[var(--nav-cta-fg)] no-underline shadow-lg hover:bg-gray-200 hover:text-[var(--nav-cta-fg)] hover:shadow-xl",
				focusRing,
			)}
		>
			<Plus className={cn("size-4", !compact && "mr-3")} aria-hidden="true" />
			{!compact && "Add product"}
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
		<nav aria-label="Admin navigation" className="pt-3 text-base font-semibold text-white">
			{items.map((item) => {
				const Icon = item.icon;
				return (
					<Link
						key={item.to}
						to={item.to}
						onClick={onNavigate}
						aria-label={compact ? item.label : undefined}
						title={compact ? item.label : undefined}
						className={cn(
							"nav-item flex items-center py-4",
							compact ? "justify-center" : "pl-6",
							focusRing,
						)}
						activeProps={{ className: "active-nav-link" }}
					>
						<Icon className={cn("size-5 shrink-0", !compact && "mr-3")} aria-hidden="true" />
						{!compact && <span className="truncate">{item.label}</span>}
					</Link>
				);
			})}
		</nav>
	);
}

function AccountMenu({
	user,
	role,
}: {
	user: { name?: string | null; email: string };
	role: Role;
}) {
	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				aria-label="Account menu"
				className="size-12 overflow-hidden rounded-full border-4 border-[var(--chip-line)] hover:border-[var(--line)] focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
			>
				<UserAvatar name={user.name} email={user.email} />
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content
					align="end"
					sideOffset={8}
					className="z-50 w-60 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] py-2 text-[var(--sea-ink)] shadow-lg outline-none"
				>
					<div className="border-b border-[var(--line)] px-4 pb-2">
						<p className="m-0 truncate text-sm font-semibold">{user.name || user.email}</p>
						{user.name && (
							<p className="m-0 truncate text-xs text-[var(--sea-ink-soft)]">{user.email}</p>
						)}
						<p className="m-0 mt-1 text-xs text-[var(--sea-ink-soft)]">
							{role === "admin" ? "Administrator" : "User"}
						</p>
					</div>
					<DropdownMenu.Item
						onSelect={() => void signOutAndReload()}
						className="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm outline-none data-[highlighted]:bg-[var(--palm)] data-[highlighted]:text-white"
					>
						<LogOut className="size-4" aria-hidden="true" />
						Sign out
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
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
	const isAdmin = role === "admin";

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
					"bg-nav sticky top-0 hidden h-dvh shrink-0 flex-col shadow-xl transition-[width] duration-200 md:flex",
					collapsed ? "w-[72px]" : "w-64",
				)}
			>
				<div className={collapsed ? "p-3 pt-6 text-center" : "p-6"}>
					<Brand compact={collapsed} />
					{isAdmin && <AddProductCta compact={collapsed} />}
				</div>
				<NavList role={role} compact={collapsed} />
				<button
					type="button"
					onClick={toggleCollapsed}
					aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
					aria-expanded={!collapsed}
					className={cn(
						"mt-auto flex w-full items-center justify-center bg-[var(--nav-active)] py-4 font-semibold text-white hover:opacity-90",
						focusRing,
					)}
				>
					{collapsed ? (
						<ChevronsRight className="size-5" aria-hidden="true" />
					) : (
						<>
							<ChevronsLeft className="mr-3 size-5" aria-hidden="true" />
							Collapse
						</>
					)}
				</button>
			</aside>

			{/* Mobile drawer */}
			<Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
				<DialogContent
					showCloseButton={false}
					className="top-0 left-0 h-dvh max-h-none w-72 max-w-[85vw] translate-x-0 translate-y-0 content-start gap-0 rounded-none border-0 bg-[var(--nav-bg)] p-0 text-white shadow-xl"
				>
					<DialogTitle className="sr-only">Navigation</DialogTitle>
					<DialogClose
						aria-label="Close navigation"
						className={cn("absolute top-5 right-4 rounded-md p-1 text-white", focusRing)}
					>
						<X className="size-6" aria-hidden="true" />
					</DialogClose>
					<div className="p-6">
						<Brand compact={false} onNavigate={() => setDrawerOpen(false)} />
						{isAdmin && <AddProductCta compact={false} onNavigate={() => setDrawerOpen(false)} />}
					</div>
					<NavList role={role} compact={false} onNavigate={() => setDrawerOpen(false)} />
					<div className="mt-6 border-t border-white/20 px-6 py-4">
						<div className="flex items-center gap-3">
							<span className="size-10 shrink-0 overflow-hidden rounded-full border-2 border-white/40">
								<UserAvatar name={user.name} email={user.email} />
							</span>
							<div className="min-w-0">
								<p className="m-0 truncate text-sm font-semibold">{user.name || user.email}</p>
								<p className="m-0 text-xs opacity-75">{isAdmin ? "Administrator" : "User"}</p>
							</div>
						</div>
					</div>
					<button
						type="button"
						onClick={() => void signOutAndReload()}
						className={cn(
							"flex w-full items-center justify-center bg-[var(--nav-active)] py-4 font-semibold text-white hover:opacity-90",
							focusRing,
						)}
					>
						<LogOut className="mr-3 size-5" aria-hidden="true" />
						Sign out
					</button>
				</DialogContent>
			</Dialog>

			<div className="flex min-w-0 flex-1 flex-col">
				{/* Mobile header */}
				<header className="bg-nav flex w-full items-center justify-between gap-3 px-6 py-5 md:hidden">
					<Brand compact={false} />
					<div className="flex items-center gap-3">
						<ThemeToggle />
						<button
							type="button"
							onClick={() => setDrawerOpen(true)}
							aria-label="Open navigation"
							className={cn("rounded-md p-1 text-3xl text-white", focusRing)}
						>
							<Menu className="size-7" aria-hidden="true" />
						</button>
					</div>
				</header>

				{/* Desktop header */}
				<header className="hidden w-full items-center gap-3 border-b border-[var(--line)] bg-[var(--header-bg)] px-6 py-2 md:flex">
					<div className="mr-auto text-sm text-[var(--sea-ink-soft)]">
						Signed in as <span className="font-semibold text-[var(--sea-ink)]">{user.email}</span>
					</div>
					<ThemeToggle />
					<AccountMenu user={user} role={role} />
				</header>

				<main id="main" className="w-full flex-1 p-6">
					{children}
				</main>
				<Footer />
			</div>
		</div>
	);
}
